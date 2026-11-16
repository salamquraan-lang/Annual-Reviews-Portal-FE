import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import { refreshSession, setAccessToken, setOnSessionLost } from '../api/client';
import type { Profile } from '../types/auth';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: Status;
  user: Profile | null;
  login: (email: string, password: string) => Promise<Profile>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<Profile | null>(null);

  const clear = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    setOnSessionLost(clear);
    let cancelled = false;
    (async () => {
      const session = await refreshSession();
      if (!session) {
        if (!cancelled) clear();
        return;
      }
      try {
        const profile = await authApi.me();
        if (!cancelled) {
          setUser(profile);
          setStatus('authenticated');
        }
      } catch {
        if (!cancelled) clear();
      }
    })();
    return () => {
      cancelled = true;
      setOnSessionLost(null);
    };
  }, [clear]);

  const login = useCallback(async (email: string, password: string) => {
    const session = await authApi.login({ email, password });
    setAccessToken(session.accessToken);
    const profile = await authApi.me();
    setUser(profile);
    setStatus('authenticated');
    return profile;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clear();
    }
  }, [clear]);

  const value = useMemo(() => ({ status, user, login, logout }), [status, user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
