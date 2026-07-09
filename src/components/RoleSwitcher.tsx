import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const APPS = [
  { key: 'owner', label: 'Office', to: '/owner', roles: ['OWNER', 'ADMIN', 'MANAGER'] },
  { key: 'collector', label: 'Collector', to: '/collector', roles: ['COLLECTOR'] },
  { key: 'technician', label: 'Technician', to: '/technician', roles: ['TECHNICIAN'] },
];

/** Lets a multi-role staff member jump to the other app(s) they can access. */
export function RoleSwitcher({ current, tone = 'dark' }: { current: string; tone?: 'dark' | 'light' }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const held: string[] = user?.roles && user.roles.length ? user.roles : (user ? [user.role] : []);
  const others = APPS.filter((a) => a.key !== current && a.roles.some((r) => held.includes(r)));
  if (others.length === 0) return null;

  const cls = tone === 'dark'
    ? 'rounded-full bg-white/10 px-3 py-1 text-xs font-600 text-white/80'
    : 'rounded-full bg-line px-3 py-1 text-xs font-600 text-ink/70';

  return (
    <div className="flex items-center gap-2">
      {others.map((a) => (
        <button key={a.key} onClick={() => nav(a.to)} className={cls}>{a.label} ↗</button>
      ))}
    </div>
  );
}
