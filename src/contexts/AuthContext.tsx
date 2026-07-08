"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { AdminUser } from "@/types";

interface AuthContextType {
  user: User | null;
  adminUser: AdminUser | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  adminUser: null,
  loading: true,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initAuth() {
      const { onAuthChange } = await import("@/firebase/auth");
      const { getAdminUser } = await import("@/firebase/firestore");

      unsubscribe = onAuthChange(async (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          const admin = await getAdminUser(firebaseUser.uid);
          setAdminUser(admin);
        } else {
          setAdminUser(null);
        }
        setLoading(false);
      });
    }

    initAuth();
    return () => unsubscribe?.();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        adminUser,
        loading,
        isAdmin: !!user && !!adminUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
