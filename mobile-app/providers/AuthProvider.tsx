import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/firebase/auth";
import { getSecureValue, setSecureValue, deleteSecureValue } from "@/services/storage/secure-storage";

type Ctx = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<Ctx>({
  user: null,
  loading: true,
  signIn: async () => {},
  logout: async () => {},
  forgotPassword: async () => {},
});

const TOKEN_KEY = "nj_firebase_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const token = await u.getIdToken();
        await setSecureValue(TOKEN_KEY, token);
      } else {
        await deleteSecureValue(TOKEN_KEY);
      }
      setLoading(false);
    });
    getSecureValue(TOKEN_KEY).finally(() => setLoading(false));
    return unsub;
  }, []);

  const signIn = async (email: string, password: string, remember = true) => {
    await signInWithEmailAndPassword(auth, email, password);
    if (!remember) await deleteSecureValue(TOKEN_KEY);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const forgotPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const value = useMemo(() => ({ user, loading, signIn, logout, forgotPassword }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
