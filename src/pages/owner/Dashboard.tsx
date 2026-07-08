import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts';
import { useOwnerStats } from '../../hooks/queries';
import { peso } from '../../api/types';
import { Spinner, StatusPill } from '../../components/ui';

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
  const { data, isLoading } = useOwnerStats();
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
