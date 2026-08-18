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
import { auth, googleProvider } from "~/lib/firebase";
import { api } from "~/lib/api";
import type { User } from "~/lib/types";

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  idToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const syncUser = useCallback(async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      setUser(null);
      setIdToken(null);
      setLoading(false);
      return;
    }

    try {
      const token = await fbUser.getIdToken();
      setIdToken(token);
      try {
        const profile = await api.verify(token);
        setUser(profile);
      } catch {
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to get ID token:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      syncUser(fbUser);
    });
    return unsubscribe;
  }, [syncUser]);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setIdToken(null);
    setFirebaseUser(null);
  };

  const refreshUser = async () => {
    if (!firebaseUser) return;
    try {
      const token = await firebaseUser.getIdToken(true);
      setIdToken(token);
      try {
        const profile = await api.verify(token);
        setUser(profile);
      } catch {
        setUser(null);
      }
    } catch {
      // token refresh failed
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        idToken,
        loading,
        signInWithGoogle,
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
