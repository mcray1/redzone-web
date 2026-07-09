import { useState } from 'react';
import { useNetwork } from '../../hooks/queries';
import type { NetworkNode } from '../../api/types';
import { Spinner, EmptyState } from '../../components/ui';

export default function Network() {
  const { data, isLoading } = useNetwork();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-700">Network</h1>
        <p className="text-sm text-ink/50">Live router health reported by the on-network agent (read-only).</p>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No routers reporting yet" hint="Run the RedZone agent on a machine in your network to see live status here." />
      ) : (
        <div className="space-y-3">
          {data.map((n) => <NodeCard key={n.id} node={n} />)}
        </div>
      )}
    </div>
  );
}

function bar(pct: number | null | undefined) {
  const v = Math.max(0, Math.min(100, pct ?? 0));
  const color = v >= 85 ? 'bg-bad' : v >= 60 ? 'bg-warn' : 'bg-good';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div className={`h-full ${color}`} style={{ width: `${v}%` }} />
    </div>
  );
}

function NodeCard({ node }: { node: NetworkNode }) {
  const [open, setOpen] = useState(false);
  const last = node.lastReportAt ? new Date(node.lastReportAt).toLocaleString('en-PH') : '—';

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-700">{node.name}</p>
          <p className="text-xs text-ink/50">{node.host || '—'}{node.version ? ` · RouterOS ${node.version}` : ''} · up {node.uptime || '—'}</p>
        </div>
        <span className={`pill ${node.online ? 'bg-good/10 text-good' : 'bg-bad/10 text-bad'}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />{node.online ? 'Online' : 'Offline'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-ink/50">CPU {node.cpuLoad ?? '—'}%</p>
          <div className="mt-1">{bar(node.cpuLoad)}</div>
        </div>
        <div>
          <p className="text-xs text-ink/50">Memory {node.memUsedPct ?? '—'}%</p>
          <div className="mt-1">{bar(node.memUsedPct)}</div>
        </div>
        <div>
          <p className="text-xs text-ink/50">Sessions</p>
          <p className="mt-0.5 font-display text-lg font-700 text-signal-600">{node.sessionCount ?? '—'}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-ink/40">Last report: {last}</p>
        {node.sessions && node.sessions.length > 0 && (
          <button className="text-xs font-600 text-signal-600" onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide sessions' : 'Active sessions'}
          </button>
        )}
      </div>

      {open && node.sessions && (
        <ul className="mt-2 max-h-64 divide-y divide-line overflow-y-auto text-sm">
          {node.sessions.map((s, i) => (
            <li key={`${s.name}-${i}`} className="flex items-center justify-between py-1.5">
              <span className="truncate font-600">{s.name}</span>
              <span className="text-xs text-ink/50">{s.address || ''}{s.uptime ? ` · ${s.uptime}` : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
