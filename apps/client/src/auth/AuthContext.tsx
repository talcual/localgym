import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { authApi } from '../api';
import type { AuthUser, UserRole } from '../api/types';
import { loadAuthToken, setAuthToken } from '../api/client';

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** `true` si el usuario es instructor o admin. Derivado de `user.role`. */
  isInstructor: boolean;
  /** `true` si el usuario es admin. */
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    role?: UserRole,
  ) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadAuthToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((u) => setUser(u))
      .catch(() => setAuthToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setAuthToken(res.access_token);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      role?: UserRole,
    ) => {
      const res = await authApi.register(email, password, displayName, role);
      setAuthToken(res.access_token);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  const isInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  const value = useMemo(
    () => ({
      user,
      loading,
      isInstructor,
      isAdmin,
      login,
      register,
      logout,
      setUser,
    }),
    [user, loading, isInstructor, isAdmin, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}