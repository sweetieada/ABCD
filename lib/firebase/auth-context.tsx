"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ensureUserProfile, getFirebaseAuthErrorMessage } from "@/lib/firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void Promise.resolve()
      .then(() => {
        if (!active) return;
        unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (nextUser) => {
          if (!active) return;
          setUser(nextUser);
          setError(null);
          if (!nextUser) {
            setLoading(false);
            return;
          }

          try {
            await ensureUserProfile(nextUser);
          } catch (profileError) {
            if (active) setError(getFirebaseAuthErrorMessage(profileError));
          } finally {
            if (active) setLoading(false);
          }
        });
      })
      .catch((initializationError: unknown) => {
        if (!active) return;
        setError(getFirebaseAuthErrorMessage(initializationError));
        setLoading(false);
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo(() => ({ user, loading, error }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
