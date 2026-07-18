import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts';
import { useOwnerStats, useAttention } from '../../hooks/queries';
import { useAuth } from '../../context/AuthContext';
import { peso } from '../../api/types';
import { Spinner, StatusPill } from '../../components/ui';
import { GrowthPanel } from '../../components/GrowthPanel';

function NeedsAttention() {
  const { data } = useAttention();
  const nav = useNavigate();
  if (!data) return null;

  const items = [
    { n: data.pendingRegistrations, label: 'new registration', to: '/owner/registrations' },
    { n: data.pendingResets, label: 'password reset', to: '/owner/password-resets' },
    { n: data.pendingExtensions, label: 'payment extension', to: '/owner/billing' },
    { n: data.pendingDiscounts, label: 'discount request', to: '/owner/billing' },
    { n: data.pendingExpenses, label: 'expense request', to: '/owner/expenses' },
    { n: data.pendingAdvances, label: 'advance request', to: '/owner/payroll' },
    { n: data.pendingRemittances, label: 'remittance to verify', to: '/owner/billing' },
    { n: data.overdueInvoices, label: 'overdue invoice', to: '/owner/billing' },
    { n: data.openTickets, label: 'open ticket', to: '/owner/tickets' },
    { n: data.scheduledJobs, label: 'scheduled job', to: '/owner/installations' },
  ].filter((i) => i.n > 0);

  return (
    <div className="card p-5">
      <h2 className="font-display font-600">Needs attention</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink/40">You're all caught up. 🎉</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((i) => (
            <button key={i.label} onClick={() => nav(i.to)}
              className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm hover:bg-paper">
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-signal/15 px-1.5 text-xs font-700 text-signal-600">{i.n}</span>
              {i.label}{i.n === 1 ? '' : 's'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-xs font-600 uppercase tracking-wide text-ink/50">{label}</p>
      <p className={`mt-1.5 font-display text-2xl font-700 ${accent ? 'text-signal-600' : 'text-ink'}`}>
        {value}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { user, hasPerm } = useAuth();
  const canViewReports = hasPerm('reports.view');
  const { data, isLoading } = useOwnerStats({ enabled: canViewReports });

  // A manager without the "view collections & reports" capability can't see the
  // numbers — greet them instead of spinning forever on a blocked request.
  if (!canViewReports) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-700">Welcome{user?.name ? `, ${user.name}` : ''}</h1>
        <p className="text-sm text-ink/60">Use the menu to reach the areas your role allows.</p>
      </div>
    );
  }

  if (isLoading || !data) return <Spinner />;

  // Status breakdown bar (real data) — not a fake trend line.
  const breakdown = [
    { name: 'Active', value: data.active, color: '#1f9d6b' },
    { name: 'Pending', value: data.pending, color: '#f5a623' },
    { name: 'Suspended', value: data.suspended, color: '#d24545' },
  ];
  const recent = data.recent;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-700">Overview</h1>
        <p className="text-sm text-ink/50">Your network at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Subscribers" value={String(data.total)} />
        <Stat label="Active" value={String(data.active)} />
        <Stat label="Monthly revenue" value={peso(data.monthlyRevenue)} accent />
        <Stat label="Outstanding" value={peso(data.outstanding)} />
      </div>

      {/* Recurring-revenue + churn analytics (P6.5) */}
      <GrowthPanel enabled={canViewReports} />

      <NeedsAttention />

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <h2 className="font-display font-600">Subscribers by status</h2>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown}>
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fontSize: 12, fill: '#1d3b5c' }} />
                <Tooltip cursor={{ fill: '#f7f8fa' }}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e3e7ec', fontSize: 13 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {breakdown.map((b) => <Cell key={b.name} fill={b.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="font-display font-600">Newest subscribers</h2>
          <ul className="mt-3 divide-y divide-line">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-600">{s.fullName}</p>
                  <p className="text-xs text-ink/50">{s.accountNo}</p>
                </div>
                <StatusPill status={s.status} />
              </li>
            ))}
            {recent.length === 0 && <p className="py-4 text-sm text-ink/40">No subscribers yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
