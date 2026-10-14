import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let auth: Auth | null = null;

export const isBrowser = typeof window !== "undefined";

/**
 * Lazily initialises Firebase Auth. Browser-only: calling this during SSR throws,
 * so only use it inside effects and event handlers.
 */
export function getFirebaseAuth(): Auth {
  if (!isBrowser) {
    throw new Error("Firebase Auth is only available in the browser");
  }
  if (!auth) {
    const app: FirebaseApp =
      getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;
    auth = getAuth(app);
  }
  return auth;
}

export function createGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

export const EMAIL_FOR_SIGN_IN_KEY = "emailForSignIn";
