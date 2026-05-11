import { useState, useEffect, createContext, useContext } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signInAnonymously,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { type CreatorProfile } from '../types';

const SILENT_AUTH_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/popup-blocked',
  'auth/user-cancelled',
  'auth/no-auth-event',
  'auth/web-storage-unsupported',
]);

export function isSilentAuthError(err: any): boolean {
  return !!err?.code && SILENT_AUTH_CODES.has(err.code);
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Module-level flag — set to true while a Google sign-in is in progress so
// the onAuthStateChanged(null) event (fired when we sign out the anonymous
// user) does NOT trigger another signInAnonymously() call that would race
// against the popup / redirect.
let googleSignInActive = false;


interface AuthContextType {
  user: User | null;
  profile: CreatorProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isWhitelisted: boolean | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
  isWhitelisted: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);

  const fetchProfileAndWhitelist = async (currentUser: User) => {
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as CreatorProfile);
        setIsWhitelisted(true);
      } else {
        setProfile(null);
        setIsWhitelisted(true);
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error?.message);
      if (error?.code === 'permission-denied') {
        setIsWhitelisted(false);
      }
    }
  };

  useEffect(() => {
    // Prevents double-triggering anonymous sign-in from both the
    // onAuthStateChanged handler and the getRedirectResult.finally() block.
    let guestSignInStarted = false;
    // Set to true once getRedirectResult has settled. After this point,
    // a null event from onAuthStateChanged means the user logged out —
    // we should clear state immediately and sign in as guest.
    let redirectChecked = false;

    const signInAsGuest = async () => {
      if (guestSignInStarted || auth.currentUser) return;
      guestSignInStarted = true;
      setProfile(null);
      setIsWhitelisted(null);
      try {
        await signInAnonymously(auth);
        // onAuthStateChanged fires again with the anonymous user → sets loading=false
      } catch {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Only fetch Firestore profile for real (non-anonymous) users.
        if (!currentUser.isAnonymous) {
          // Google user successfully signed in — clear guest flag if it was set
          localStorage.removeItem('freeTrialUsed');
          await fetchProfileAndWhitelist(currentUser);
        }
        setLoading(false);
      } else if (googleSignInActive) {
        // A Google sign-in signed out the anonymous user — don't interfere.
        // Let the Google auth flow complete; it will fire onAuthStateChanged
        // again with the real user.
        setLoading(false);
      } else if (redirectChecked) {
        // Redirect result already settled — this null means the user logged out.
        // Clear user state immediately so ProtectedRoute redirects to /login.
        setUser(null);
        setProfile(null);
        setIsWhitelisted(null);
        setLoading(false);
        // Re-establish anonymous guest session in the background.
        guestSignInStarted = false;
        signInAsGuest();
      }
      // If null, not googleSignInActive, and redirectChecked is false:
      // wait for getRedirectResult to settle before acting (mobile redirect case).
    });

    // On mobile, when the app loads after a Google redirect, Firebase needs
    // time to process the redirect result. If we call signInAnonymously()
    // inside onAuthStateChanged(null) above, it races against — and can
    // overwrite — the incoming Google session.
    //
    // Solution: only sign in as guest AFTER getRedirectResult resolves.
    // If a Google user came in via redirect, auth.currentUser will already
    // be set in the finally block and we skip anonymous sign-in.
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          // Google user successfully signed in via redirect — clear guest flag
          localStorage.removeItem('freeTrialUsed');
        }
      })
      .catch((err: any) => {
        if (!isSilentAuthError(err)) {
          console.warn('getRedirectResult:', err?.code || err?.message);
        }
      })
      .finally(() => {
        redirectChecked = true;
        if (!auth.currentUser && !googleSignInActive) {
          signInAsGuest();
        }
      });

    // Hard safety net — if auth state never resolves within 8 seconds,
    // unblock the UI rather than leaving the user stuck on the loader.
    const timeoutId = window.setTimeout(() => {
      setLoading((current) => (current ? false : current));
    }, 8000);

    return () => {
      unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, []);

  const signInWithGoogle = async () => {
    googleSignInActive = true;
    try {
      // Sign out the anonymous session first so Google can take over.
      if (auth.currentUser?.isAnonymous) {
        try { await signOut(auth); } catch { /* best effort */ }
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      if (isMobileDevice()) {
        // Redirect on mobile: page navigates away immediately so there is
        // no "stuck" button. authDomain = publishkit.web.app means the
        // redirect handler is same-origin — no cross-origin storage block.
        await signInWithRedirect(auth, provider);
      } else {
        // Popup on desktop: postMessage-based, resolves in the same tab.
        await signInWithPopup(auth, provider);
        // Successful popup sign-in — clear guest flag
        localStorage.removeItem('freeTrialUsed');
      }
    } finally {
      googleSignInActive = false;
      // If the popup was dismissed / errored and we have no user left,
      // restore the anonymous guest session so the UI isn't stuck.
      if (!auth.currentUser) {
        try { await signInAnonymously(auth); } catch { /* offline etc */ }
      }
    }
  };

  const logout = async () => {
    // Only mark as used if the CURRENT session was actually used.
    // The UploadProvider handles setting this when a session completes.
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndWhitelist(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signInWithGoogle, logout, refreshProfile, isWhitelisted }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
