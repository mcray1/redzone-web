import { useState } from 'react';
import { useAuditLog } from '../../hooks/queries';
import { Spinner } from '../../components/ui';

function actionLabel(a: string) {
  const s = a.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Audit() {
  const [limit, setLimit] = useState(100);
  const { data, isLoading } = useAuditLog(limit);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-700">Activity log</h1>
        <p className="text-sm text-ink/50">Recent sensitive actions — who did what, when.</p>
      </div>

      <div className="card p-5">
        {isLoading ? (
          <Spinner />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-ink/40">No activity recorded yet.</p>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {data.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-600">{actionLabel(l.action)}</p>
                    <p className="truncate text-xs text-ink/50">{l.userName}{l.target ? ` · ${l.target}` : ''}</p>
                  </div>
                  <span className="shrink-0 text-xs text-ink/40">{new Date(l.createdAt).toLocaleString('en-PH')}</span>
                </li>
              ))}
            </ul>
            {data.length >= limit && (
              <button className="btn-ghost mt-3 w-full" onClick={() => setLimit((l) => l + 100)}>Load more</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
