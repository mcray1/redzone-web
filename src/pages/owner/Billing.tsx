import { useNavigate } from 'react-router-dom';
import { useOwnerStats } from '../../hooks/queries';
import { peso } from '../../api/types';
import { Spinner, StatusPill, EmptyState } from '../../components/ui';

export default function Billing() {
  const { data, isLoading } = useOwnerStats();
  const nav = useNavigate();
  if (isLoading || !data) return <Spinner />;

  const owing = data.items
    .filter((s) => s.balanceCents > 0)
    .sort((a, b) => b.balanceCents - a.balanceCents);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-700">Billing</h1>
        <p className="text-sm text-ink/50">Accounts with outstanding balances.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card px-5 py-4">
          <p className="text-xs font-600 uppercase tracking-wide text-ink/50">Total outstanding</p>
          <p className="mt-1.5 font-display text-2xl font-700 text-bad">{peso(data.outstanding)}</p>
        </div>
        <div className="card px-5 py-4">
          <p className="text-xs font-600 uppercase tracking-wide text-ink/50">Accounts owing</p>
          <p className="mt-1.5 font-display text-2xl font-700">{owing.length}</p>
        </div>
      </div>

      {owing.length === 0 ? (
        <EmptyState title="Everyone's paid up" hint="No outstanding balances right now." />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {owing.map((s) => (
            <button key={s.id} onClick={() => nav(`/owner/subscribers/${s.id}`)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-paper">
              <div className="min-w-0">
                <p className="truncate font-600">{s.fullName}</p>
                <p className="text-xs text-ink/50">{s.accountNo} · due day {s.dueDay}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-600 text-bad">{peso(s.balanceCents)}</span>
                <StatusPill status={s.status} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
