import { useGrowth } from '../hooks/queries';
import { peso } from '../api/types';

// Owner growth dashboard: recurring-revenue KPIs + a collected-revenue trend.
// Rendered only when the caller has reports access (Dashboard gates it).
function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-paper p-3">
      <p className="text-xs text-ink/40">{label}</p>
      <p className="mt-1 font-display text-lg font-700">{value}</p>
    </div>
  );
}

export function GrowthPanel({ enabled = true }: { enabled?: boolean }) {
  const { data: g, isLoading } = useGrowth({ enabled });
  if (!enabled || isLoading || !g) return null;

  const max = Math.max(1, ...g.collectedByMonth.map((m) => m.cents));

  return (
    <div className="card p-5">
      <h2 className="font-display font-600">Growth</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="MRR" value={peso(g.mrrCents)} />
        <Kpi label="ARPU" value={peso(g.arpuCents)} />
        <Kpi label="Active" value={String(g.activeSubscribers)} />
        <Kpi label="Churn (30d)" value={`${g.churnRatePct}%`} />
      </div>
      <p className="mt-3 text-xs text-ink/40">{g.new30d} new · {g.churned30d} churned in the last 30 days</p>

      {g.collectedByMonth.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-600 uppercase tracking-wide text-ink/40">Collected by month</p>
          <div className="mt-2 space-y-1">
            {g.collectedByMonth.map((m) => (
              <div key={m.month} className="flex items-center gap-2 text-sm">
                <span className="w-16 text-ink/50">{m.month}</span>
                <div className="h-2 flex-1 rounded bg-paper">
                  <div className="h-2 rounded bg-signal" style={{ width: `${Math.round((m.cents / max) * 100)}%` }} />
                </div>
                <span className="w-24 text-right font-600">{peso(m.cents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
