import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser, getCurrentUser, isAuthenticated, signIn, signOut, signUp } from '../services/auth';

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // 防止后端请求迟滞导致 loading 长时间卡住
    const fallbackTimer = window.setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);
    (async () => {
      try {
        const u = await getCurrentUser();
        if (mounted) setUser(u);
      } finally {
        if (mounted) {
          window.clearTimeout(fallbackTimer);
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; window.clearTimeout(fallbackTimer); };
  }, []);

  const login = async (email: string, password: string) => {
    const u = await signIn(email, password);
    setUser(u);
  };

  const register = async (email: string, password: string) => {
    const u = await signUp(email, password);
    setUser(u);
  };

  const logout = () => {
    signOut();
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) { return { user: null, loading: false, login: async () => {}, register: async () => {}, logout: () => {}, }; }
  return ctx;
};

export const isLoggedIn = () => isAuthenticated();