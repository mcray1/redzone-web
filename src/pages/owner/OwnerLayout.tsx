import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { PermissionKey } from '../../api/types';
import { Logo } from '../../components/ui';
import { ChangePasswordModal } from '../../components/ChangePasswordModal';
import { RoleSwitcher } from '../../components/RoleSwitcher';

// `perm` — a manager sees the item if they hold ANY of these capabilities.
// `adminOnly` — only true owners/admins see it (never delegated to a manager).
// Neither — visible to any staff who reach this layout.
interface NavItem { to: string; label: string; end?: boolean; icon: string; perm?: PermissionKey[]; adminOnly?: boolean; }

const OVERVIEW: NavItem = { to: '/owner', label: 'Overview', end: true, icon: 'M3 12l9-9 9 9M5 10v10h14V10', perm: ['reports.view'] };

const SECTIONS: { label: string | null; items: NavItem[] }[] = [
  { label: null, items: [OVERVIEW] },
  {
    label: 'Operations',
    items: [
      { to: '/owner/subscribers', label: 'Subscribers', icon: 'M16 14a4 4 0 10-8 0M12 7a3 3 0 100 .01M2 21a8 8 0 0120 0' },
      { to: '/owner/plans', label: 'Plans', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', adminOnly: true },
      { to: '/owner/installations', label: 'Installs', icon: 'M14 2l6 6-9 9H5v-6zM10 8l6 6', adminOnly: true },
      { to: '/owner/inventory', label: 'Inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', adminOnly: true },
      { to: '/owner/network', label: 'Network', icon: 'M5 12.55a11 11 0 0114 0M8.5 16.1a6 6 0 017 0M12 20h.01M2 8.82a15 15 0 0120 0', adminOnly: true },
      { to: '/owner/tickets', label: 'Tickets', icon: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z' },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/owner/billing', label: 'Billing', icon: 'M3 6h18v12H3zM3 10h18', perm: ['payments.void', 'extensions.approve', 'remittances.verify'] },
      { to: '/owner/expenses', label: 'Expenses', icon: 'M3 10h18M7 15h4M3 6h18v12H3zM3 6l0 4', perm: ['reports.view', 'expenses.approve'] },
      { to: '/owner/payroll', label: 'Payroll', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6', adminOnly: true },
      { to: '/owner/reports', label: 'Reports', icon: 'M9 17V9M15 17v-4M4 4h16v16H4zM4 8h16', perm: ['reports.view'] },
    ],
  },
  {
    label: 'Team',
    items: [
      { to: '/owner/staff', label: 'Staff', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 .01M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75', perm: ['coverage.assign'] },
      { to: '/owner/roles', label: 'Roles', icon: 'M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z', adminOnly: true },
      { to: '/owner/audit', label: 'Activity log', icon: 'M12 6v6l4 2M12 22a10 10 0 100-20 10 10 0 000 20', adminOnly: true },
    ],
  },
];

// Bottom-bar primaries on mobile; everything else lives under "More".
const MOBILE_PRIMARY: NavItem[] = [
  OVERVIEW,
  SECTIONS[1].items[0], // Subscribers
  { to: '/owner/billing', label: 'Billing', icon: 'M3 6h18v12H3zM3 10h18' },
];
const MORE_ICON = 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z';

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d={d} />
    </svg>
  );
}

export default function OwnerLayout() {
  const { user, logout, hasPerm } = useAuth();
  const navigate = useNavigate();
  const [pwOpen, setPwOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Owners/admins see everything; a manager only sees items their role allows.
  const isAdmin = (user?.roles ?? [user?.role]).some((r) => r === 'OWNER' || r === 'ADMIN');
  const canSee = (n: NavItem) => {
    if (isAdmin) return true;
    if (n.adminOnly) return false;
    if (!n.perm) return true;
    return n.perm.some((p) => hasPerm(p));
  };
  const visibleSections = useMemo(
    () => SECTIONS.map((sec) => ({ ...sec, items: sec.items.filter(canSee) })).filter((sec) => sec.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user]
  );

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-500 ${
      isActive ? 'bg-ink text-white' : 'text-ink/70 hover:bg-line/50'
    }`;

  return (
    <div className="min-h-full md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white md:flex">
        <div className="px-5 py-5"><Logo /></div>
        <nav className="flex-1 space-y-4 px-3">
          {visibleSections.map((sec, i) => (
            <div key={i} className="space-y-1">
              {sec.label && (
                <p className="px-3 pt-2 text-[10px] font-700 uppercase tracking-wider text-ink/35">{sec.label}</p>
              )}
              {sec.items.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
                  <Icon d={n.icon} />{n.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <p className="px-2 text-sm font-600 text-ink">{user?.name}</p>
          <p className="px-2 text-xs text-ink/50">{user?.role}</p>
          <div className="px-2 pt-2"><RoleSwitcher current="owner" tone="light" /></div>
          <button onClick={() => setPwOpen(true)}
            className="btn-ghost mt-2 w-full justify-start text-sm">Change password</button>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="btn-ghost mt-1 w-full justify-start text-sm">Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 pb-20 md:pb-0">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
          <Logo />
          <div className="flex items-center gap-3">
            <button onClick={() => setPwOpen(true)} className="text-sm font-600 text-ink/60">Password</button>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="text-sm font-600 text-ink/60">Sign out</button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav — a few primaries + More */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-white md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {MOBILE_PRIMARY.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-600 ${
                isActive ? 'text-signal-600' : 'text-ink/50'
              }`}>
            <Icon d={n.icon} />{n.label}
          </NavLink>
        ))}
        <button onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-600 text-ink/50">
          <Icon d={MORE_ICON} />More
        </button>
      </nav>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end bg-ink/40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="rounded-t-2xl bg-white p-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            {visibleSections.map((sec, i) => (
              <div key={i} className="mb-2">
                {sec.label && <p className="px-1 pb-1 pt-2 text-[10px] font-700 uppercase tracking-wider text-ink/35">{sec.label}</p>}
                <div className="grid grid-cols-2 gap-2">
                  {sec.items.map((n) => (
                    <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-500 ${
                          isActive ? 'border-ink bg-ink text-white' : 'border-line text-ink/70'
                        }`}>
                      <Icon d={n.icon} />{n.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}
    </div>
  );
}
