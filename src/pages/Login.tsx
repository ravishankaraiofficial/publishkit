import { Navigate } from 'react-router-dom';
import { useAuth, isSilentAuthError } from '../hooks/useAuth';
import { useState } from 'react';
import { useToast } from '../components/ui/Toast';
import { Loader2 } from 'lucide-react';

export function Login() {
  const { user, signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Real Google user → go straight to the app.
  if (user && !user.isAnonymous) {
    return <Navigate to="/" replace />;
  }

  // Anonymous user who hasn't used their free trial → send them to the app.
  if (user?.isAnonymous && localStorage.getItem('freeTrialUsed') !== 'true') {
    return <Navigate to="/" replace />;
  }

  // Anonymous user whose trial IS used → fall through to show the login page.

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // On mobile, signInWithRedirect navigates the page away immediately,
      // so the finally below never runs — that's fine, the component unmounts.
      // On desktop, signInWithPopup resolves here; navigation happens via
      // onAuthStateChanged, so we let finally reset the button in the meantime.
    } catch (error: any) {
      // Swallow false-positive errors — these don't reflect real failures.
      if (isSilentAuthError(error)) {
        console.warn('Silent auth signal:', error?.code);
      } else {
        console.error(error);
        toast(error.message || 'Failed to sign in', 'error');
      }
    } finally {
      // Always reset — covers popup dismissed, error thrown, or resolved but
      // navigation hasn't fired yet.
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0D0D0D] text-[#F5F5F5] flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background glow blobs */}
      <div className="glow-bg" aria-hidden="true">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>

      {/* Hero Section — always visible first */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-3xl w-full fade-in">

        {/* Big glowing title */}
        <h1
          className="hero-glow text-6xl sm:text-7xl md:text-8xl font-extrabold text-white tracking-tight leading-tight"
          style={{ letterSpacing: '-0.03em' }}
        >
          PublishKit
        </h1>

        {/* Big glowing subtitle */}
        <p
          className="hero-glow mt-6 text-xl sm:text-2xl md:text-3xl font-semibold max-w-2xl leading-snug"
          style={{ color: '#E05A1E' }}
        >
          Turn your edited audio into a complete YouTube publish kit.
        </p>

        {/* Feature bullets — each card is clickable and triggers sign-in */}
        <ul className="mt-12 flex flex-col sm:flex-row gap-6 sm:gap-8 text-left w-full max-w-2xl">
          {[
            { icon: '🎙️', text: 'Upload any audio, PDF or image' },
            { icon: '⚡', text: 'AI generates titles, timestamps & description in 90 seconds' },
            { icon: '📋', text: 'Copy & paste directly into YouTube — done!' },
          ].map((item) => (
            <li
              key={item.text}
              className="flex-1"
            >
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full h-full flex flex-col items-center sm:items-start gap-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#E05A1E]/60 rounded-2xl p-5 text-left transition-colors disabled:opacity-60"
              >
                <span className="text-3xl">{item.icon}</span>
                <span className="text-sm text-[#CFCFCF] leading-relaxed">{item.text}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Divider */}
        <div className="mt-14 w-full max-w-sm h-px bg-[#2A2A2A]" />

        {/* CTA — below all the content */}
        {/* Free trial exhausted message */}
        {localStorage.getItem('freeTrialUsed') === 'true' && (
          <div className="mt-10 mb-4 w-full max-w-sm rounded-xl bg-[#1A1A1A] border border-[#E05A1E]/40 px-5 py-4 text-center">
            <p className="text-white font-semibold text-sm mb-1">Your free session has been used</p>
            <p className="text-[#888888] text-xs leading-relaxed">
              Sign in with Google to continue using PublishKit — it's free.
            </p>
          </div>
        )}
        {localStorage.getItem('freeTrialUsed') !== 'true' && (
          <p className="mt-10 text-sm text-[#888888] mb-4">Sign in to get started — it's free</p>
        )}
        <button
          onClick={handleLogin}
          disabled={isLoading}
          id="google-signin-btn"
          className="w-full max-w-sm rounded-xl bg-[#E05A1E] hover:bg-[#FF7A3D] hover:shadow-[0_0_28px_rgba(224,90,30,0.55)] text-white font-semibold text-lg py-4 transition-all disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-3"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="white" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="white" fillOpacity="0.85" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="white" fillOpacity="0.7" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="white" fillOpacity="0.6" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p className="mt-5 text-xs text-[#555555]">
          Personal use only · Your data stays private
        </p>
      </div>
    </div>
  );
}
