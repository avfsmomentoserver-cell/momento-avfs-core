/** Authentication context: session token, current user, role helpers. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { ApiError, api, getAuthToken, setAuthToken } from "@/lib/api";
import type { UserRecord } from "@/lib/types";

interface AuthContextValue {
  user: UserRecord | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isOperator: boolean;
  isPremium: boolean;
  login: (email: string, password: string) => Promise<UserRecord>;
  register: (email: string, password: string, displayName?: string) => Promise<UserRecord>;
  logout: () => void;
  refresh: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!getAuthToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const result = await api.me();
      setUser(result.user);
    } catch (err) {
      // An expired or invalid token should not strand the user on a blank screen.
      if (err instanceof ApiError && err.status === 401) {
        setAuthToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string): Promise<UserRecord> => {
    setError(null);
    try {
      const result = await api.login(email.trim(), password);
      setAuthToken(result.token);
      setUser(result.user);
      return result.user;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(message);
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string): Promise<UserRecord> => {
    setError(null);
    try {
      const result = await api.register(email.trim(), password, displayName);
      setAuthToken(result.token);
      setUser(result.user);
      return result.user;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback((): void => {
    setAuthToken(null);
    setUser(null);
    setError(null);
  }, []);

  const clearError = useCallback((): void => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: user !== null,
      isOperator: user?.is_operator ?? false,
      isPremium: (user?.is_premium ?? false) || (user?.is_operator ?? false),
      login,
      register,
      logout,
      refresh,
      clearError,
    }),
    [user, loading, error, login, register, logout, refresh, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
