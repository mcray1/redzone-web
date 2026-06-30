import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/ui';

const nav = [
  { to: '/owner', label: 'Overview', end: true, icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { to: '/owner/subscribers', label: 'Subscribers', icon: 'M16 14a4 4 0 10-8 0M12 7a3 3 0 100 .01M2 21a8 8 0 0120 0' },
  { to: '/owner/billing', label: 'Billing', icon: 'M3 6h18v12H3zM3 10h18' },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d={d} />
    </svg>
  );
}

export default function OwnerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-full md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white md:flex">
        <div className="px-5 py-5"><Logo /></div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-500 ${
                  isActive ? 'bg-ink text-white' : 'text-ink/70 hover:bg-line/50'
                }`}>
              <Icon d={n.icon} />{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <p className="px-2 text-sm font-600 text-ink">{user?.name}</p>
          <p className="px-2 text-xs text-ink/50">{user?.role}</p>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="btn-ghost mt-2 w-full justify-start text-sm">Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 pb-20 md:pb-0">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
          <Logo />
          <button onClick={() => { logout(); navigate('/login'); }}
            className="text-sm font-600 text-ink/60">Sign out</button>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-white md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-600 ${
                isActive ? 'text-signal-600' : 'text-ink/50'
              }`}>
            <Icon d={n.icon} />{n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
