import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokens } from '../api/client';
import type { User, PermissionKey } from '../api/types';

export type LoginResult =
  | { mfaRequired: true; mfaToken: string }
  | { mfaRequired: false; user: User };

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  // Second step when 2FA is on: exchange the mfaToken + 6-digit code for a session.
  verifyMfa: (mfaToken: string, code: string) => Promise<User>;
  logout: () => void;
  // True if the signed-in user can perform this capability. Owners/admins hold
  // '*' and can do everything. This is a UI hint only — the backend still enforces.
  hasPerm: (key: PermissionKey) => boolean;
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

  function finishLogin(data: { accessToken: string; refreshToken: string; user: User }) {
    tokens.set(data);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  }

  async function login(email: string, password: string): Promise<LoginResult> {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.mfaRequired) return { mfaRequired: true, mfaToken: data.mfaToken as string };
    finishLogin(data);
    return { mfaRequired: false, user: data.user as User };
  }

  async function verifyMfa(mfaToken: string, code: string): Promise<User> {
    const { data } = await api.post('/auth/mfa', { mfaToken, code });
    finishLogin(data);
    return data.user as User;
  }

  function logout() {
    const rt = tokens.refresh;
    if (rt) api.post('/auth/logout', { refreshToken: rt }).catch(() => {});
    tokens.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  function hasPerm(key: PermissionKey) {
    // Owner and admin always hold every capability — including any new one or
    // anything assigned to a custom role — by virtue of their role, regardless
    // of what the (possibly older) stored permissions list contains.
    const roles = user?.roles ?? (user?.role ? [user.role] : []);
    if (roles.includes('OWNER') || roles.includes('ADMIN')) return true;
    const perms = user?.permissions ?? [];
    return perms.includes('*') || perms.includes(key);
  }

  return <Ctx.Provider value={{ user, loading, login, verifyMfa, logout, hasPerm }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
