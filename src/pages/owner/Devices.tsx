import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCpeConfigured, useCpeDevices } from '../../hooks/queries';
import type { CpeDevice } from '../../api/types';
import { Spinner, EmptyState } from '../../components/ui';

function uptime(seconds?: number | null) {
  if (!seconds || seconds <= 0) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d) return `${d}d ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default function Devices() {
  const { hasPerm } = useAuth();
  const canView = hasPerm('cpe.view') || hasPerm('cpe.manage');
  const { data: configured } = useCpeConfigured(canView);
  const { data, isLoading } = useCpeDevices(canView && configured === true);
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [onlyOffline, setOnlyOffline] = useState(false);
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);

  const online = data?.filter((d) => d.online).length ?? 0;
  const unlinked = data?.filter((d) => !d.subscriber).length ?? 0;

  const rows = useMemo(() => {
    let list = data ?? [];
    if (onlyOffline) list = list.filter((d) => !d.online);
    if (unlinkedOnly) list = list.filter((d) => !d.subscriber);
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((d) =>
        [d.subscriber?.fullName, d.subscriber?.accountNo, d.pppoeUsername, d.serial, d.ssid, d.productClass]
          .some((v) => v && v.toLowerCase().includes(term)));
    }
    return list;
  }, [data, q, onlyOffline, unlinkedOnly]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-700">Customer devices</h1>
        <p className="text-sm text-ink/50">CPE reported by GenieACS, matched to subscribers by PPPoE username.</p>
      </div>

      {!canView ? (
        <EmptyState title="No access" hint="You don't have permission to view customer devices." />
      ) : configured === false ? (
        <EmptyState title="GenieACS not connected" hint="Set GENIEACS_NBI_URL on the server to switch on device management. See GENIEACS_SETUP.md." />
      ) : configured === undefined || isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No devices reporting yet" hint="Point your CPEs at the GenieACS server; they'll appear here once they inform." />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total" value={String(data.length)} />
            <Stat label="Online" value={String(online)} accent />
            <Stat label="Unlinked" value={String(unlinked)} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input className="input flex-1" placeholder="Search name, account, PPPoE, serial, WiFi…"
              value={q} onChange={(e) => setQ(e.target.value)} />
            <button onClick={() => setOnlyOffline((v) => !v)}
              className={`pill border whitespace-nowrap ${onlyOffline ? 'border-bad bg-bad/10 text-bad' : 'border-line text-ink/60'}`}>
              Offline only
            </button>
            <button onClick={() => setUnlinkedOnly((v) => !v)}
              className={`pill border whitespace-nowrap ${unlinkedOnly ? 'border-ink bg-ink text-white' : 'border-line text-ink/60'}`}>
              Unlinked only
            </button>
          </div>

          <div className="card divide-y divide-line overflow-hidden">
            {rows.map((d) => <DeviceRow key={d.id} d={d} onOpen={() => d.subscriber && nav(`/owner/subscribers/${d.subscriber.id}`)} />)}
            {rows.length === 0 && <p className="px-4 py-6 text-sm text-ink/40">No devices match.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function DeviceRow({ d, onOpen }: { d: CpeDevice; onOpen: () => void }) {
  const inner = (
    <>
      <div className="min-w-0">
        <p className="truncate font-600">
          {d.subscriber ? d.subscriber.fullName : (d.pppoeUsername || d.serial || 'Unknown device')}
          {!d.subscriber && <span className="ml-2 text-xs font-500 text-warn">unlinked</span>}
        </p>
        <p className="truncate text-xs text-ink/50">
          {d.productClass || d.manufacturer || '—'}
          {d.ssid ? ` · WiFi: ${d.ssid}` : ''}
          {d.pppoeUsername ? ` · ${d.pppoeUsername}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden text-xs text-ink/40 sm:inline">up {uptime(d.uptimeSeconds)}</span>
        <span className={`pill ${d.online ? 'bg-good/10 text-good' : 'bg-ink/10 text-ink/50'}`}>
          {d.online ? 'Online' : 'Offline'}
        </span>
      </div>
    </>
  );

  return d.subscriber ? (
    <button onClick={onOpen} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-paper">
      {inner}
    </button>
  ) : (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">{inner}</div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-xs font-600 uppercase tracking-wide text-ink/50">{label}</p>
      <p className={`mt-1.5 font-display text-2xl font-700 ${accent ? 'text-good' : 'text-ink'}`}>{value}</p>
    </div>
  );
}
