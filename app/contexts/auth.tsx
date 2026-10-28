import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { createGoogleProvider, getFirebaseAuth, isBrowser } from "~/lib/firebase";
import { api, describeError } from "~/lib/api";
import type { User } from "~/lib/types";

const localFlowBuild = import.meta.env.DEV && import.meta.env.VITE_LOCAL_FLOW === "1";

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  /** True once Firebase has a signed-in user. API calls fetch their own ID token. */
  idToken: string | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInLocal: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const syncUser = useCallback(async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      setUser(null);
      setIdToken(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      const token = await fbUser.getIdToken();
      setIdToken(token);
      const profile = await api.verify();
      setUser(profile);
      setError(null);
    } catch (err) {
      setUser(null);
      setError(describeError(err, "Couldn't finish signing you in."));
    } finally {
      setLoading(false);
    }
  }, []);

  const signInLocal = useCallback(async () => {
    if (!localFlowBuild) {
      throw new Error("Local sign-in is not available");
    }
    const local = await import("~/lib/local-flow");
    local.markLocalSession();
    setError(null);
    setLoading(true);
    try {
      const profile = await api.verify();
      setIdToken(local.LOCAL_CARETAKER_TOKEN);
      setUser(profile);
      setFirebaseUser(null);
    } catch (err) {
      local.clearLocalSession();
      setUser(null);
      setIdToken(null);
      setError(describeError(err, "Couldn't finish signing you in."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isBrowser) return;
    if (localFlowBuild) {
      void (async () => {
        const local = await import("~/lib/local-flow");
        if (local.localSessionActive()) {
          await signInLocal();
        } else {
          setLoading(false);
        }
      })();
      return;
    }
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (fbUser) => {
      setFirebaseUser(fbUser);
      void syncUser(fbUser);
    });
    return unsubscribe;
  }, [syncUser, signInLocal]);

  const signInWithGoogle = async () => {
    setError(null);
    await signInWithPopup(getFirebaseAuth(), createGoogleProvider());
  };

  const signOut = async () => {
    if (localFlowBuild) {
      const local = await import("~/lib/local-flow");
      local.clearLocalSession();
    } else {
      await firebaseSignOut(getFirebaseAuth());
    }
    setUser(null);
    setIdToken(null);
    setFirebaseUser(null);
    setError(null);
  };

  const refreshUser = async () => {
    if (localFlowBuild) {
      try {
        const profile = await api.verify();
        setUser(profile);
        setError(null);
      } catch (err) {
        setError(describeError(err, "Couldn't refresh your profile."));
      }
      return;
    }
    if (!firebaseUser) return;
    try {
      const token = await firebaseUser.getIdToken(true);
      setIdToken(token);
      const profile = await api.verify();
      setUser(profile);
      setError(null);
    } catch (err) {
      setError(describeError(err, "Couldn't refresh your profile."));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        idToken,
        loading,
        error,
        signInWithGoogle,
        signInLocal,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
