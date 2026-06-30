import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokens } from '../api/client';
import type { User } from '../api/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);
const USER_KEY = 'rz_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [loading] = useState(false);

  useEffect(() => {
    const onLogout = () => { setUser(null); localStorage.removeItem(USER_KEY); };
    window.addEventListener('rz:logout', onLogout);
    return () => window.removeEventListener('rz:logout', onLogout);
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    tokens.set(data);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user as User;
  }

  function logout() {
    const rt = tokens.refresh;
    if (rt) api.post('/auth/logout', { refreshToken: rt }).catch(() => {});
    tokens.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
