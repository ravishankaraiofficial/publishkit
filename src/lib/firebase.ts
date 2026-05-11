import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  // TODO: Replace with your actual Firebase config object when setting up
  // For now we use placeholders so it builds
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForBuilds1234567890",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "creator-cockpit.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "creator-cockpit-placeholder",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "creator-cockpit.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef1234567890"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize App Check
// Note: In development, you'll need a debug token.
// See: https://firebase.google.com/docs/app-check/web/debug-provider
initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider('6LcapOQsAAAAAIruihJKCmhDKLWmKhp2I9VqgYKh'),
  isTokenAutoRefreshEnabled: true
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
