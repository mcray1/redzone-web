import { useNavigate } from 'react-router-dom';
import { useForDisconnection, useSetSubscriberStatus } from '../../hooks/queries';
import { useAuth } from '../../context/AuthContext';
import { peso } from '../../api/types';
import { Spinner, EmptyState } from '../../components/ui';

export default function Disconnections() {
  const { data, isLoading } = useForDisconnection();
  const { hasPerm } = useAuth();
  const setStatus = useSetSubscriberStatus();
  const nav = useNavigate();
  const canSuspend = hasPerm('subscribers.status');

  function suspend(id: string, name: string) {
    if (window.confirm(`Suspend ${name}? Their service is cut until they pay.`)) {
      setStatus.mutate({ id, status: 'SUSPENDED' });
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-700">For disconnection</h1>
        <p className="text-sm text-ink/50">Active subscribers overdue past their plan's grace period. Highest overdue first.</p>
      </div>

      {isLoading ? <Spinner /> : !data || data.rows.length === 0 ? (
        <EmptyState title="Nobody to cut off" hint="No active subscriber is overdue beyond their grace period." />
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-4">
            <span className="font-display text-2xl font-700 text-bad">{peso(data.totalCents)}</span>
            <span className="text-sm text-ink/50">{data.count} account{data.count === 1 ? '' : 's'} past grace</span>
          </div>

          <div className="card divide-y divide-line overflow-hidden">
            {data.rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <button className="min-w-0 text-left" onClick={() => nav(`/owner/subscribers/${r.id}`)}>
                  <p className="truncate font-600">{r.subscriber}</p>
                  <p className="truncate text-xs text-ink/50">
                    {r.accountNo}{r.phone ? ` · ${r.phone}` : ''}{r.barangay ? ` · ${r.barangay}` : ''}
                  </p>
                  <p className="text-xs text-bad">{r.daysOverdue} days overdue · grace {r.graceDays}d</p>
                </button>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-600 text-bad">{peso(r.balanceCents)}</span>
                  {canSuspend && (
                    <button className="pill border border-bad/40 text-bad" disabled={setStatus.isPending}
                      onClick={() => suspend(r.id, r.subscriber)}>Suspend</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
