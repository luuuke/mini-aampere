"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UNAUTHORIZED_EVENT } from "@/lib/api/client";
import {
  readStoredSession,
  removeStoredSession,
  storeSession,
  subscribeToStoredSession,
  type AuthSession,
  type AuthUser,
} from "@/lib/auth";

interface AuthContextValue {
  accessToken: string | null;
  isReady: boolean;
  user: AuthUser | null;
  completeLogin: (session: AuthSession) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const subscribeToHydration = () => () => undefined;
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;
const getServerSessionSnapshot = () => null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const session = useSyncExternalStore(
    subscribeToStoredSession,
    readStoredSession,
    getServerSessionSnapshot,
  );
  const isReady = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );

  const logout = useCallback(() => {
    removeStoredSession();
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  const completeLogin = useCallback((nextSession: AuthSession) => {
    storeSession(nextSession);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken: session?.accessToken ?? null,
      isReady,
      user: session?.user ?? null,
      completeLogin,
      logout,
    }),
    [completeLogin, isReady, logout, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
