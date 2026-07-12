import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetwork, useSubscribers, useUpdateSubscriber, useNetworkSetup, useRemoveNetworkNode } from '../../hooks/queries';
import { useAuth } from '../../context/AuthContext';
import type { NetworkNode } from '../../api/types';
import { Spinner } from '../../components/ui';

export default function Network() {
  const { data, isLoading } = useNetwork();
  const { hasPerm } = useAuth();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-700">Network</h1>
          <p className="text-sm text-ink/50">Live router health reported by each device (read-only).</p>
        </div>
        {hasPerm('routers.manage') && (
          <button className="btn-primary shrink-0" onClick={() => setAddOpen(true)}>Add device</button>
        )}
      </div>

      {addOpen && <AddDeviceModal onClose={() => setAddOpen(false)} />}

      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <div className="card p-6">
          <h2 className="font-display text-lg font-700">No devices reporting yet</h2>
          <p className="mt-1 text-sm text-ink/60">
            Here's how this page fills up:
          </p>
          <ol className="mt-3 space-y-2 text-sm text-ink/70">
            <li><span className="font-600 text-signal-600">1.</span> Each MikroTik router runs a small self-report script (no extra hardware, no VPN).</li>
            <li><span className="font-600 text-signal-600">2.</span> Every minute it sends its health — CPU, memory, uptime, and who's online — to RedZone over the internet. It's read-only; nothing on the router changes.</li>
            <li><span className="font-600 text-signal-600">3.</span> Once a router reports, it shows up here as a live card and stays updated.</li>
          </ol>
          {hasPerm('routers.manage') ? (
            <button className="btn-primary mt-4" onClick={() => setAddOpen(true)}>Add your first device</button>
          ) : (
            <p className="mt-4 text-xs text-ink/40">Ask an owner or admin to add a device.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((n) => <NodeCard key={n.id} node={n} canManage={hasPerm('routers.manage')} />)}
        </div>
      )}
    </div>
  );
}

// Builds the RouterOS script a new MikroTik pastes to start reporting.
function buildScript(url: string, token: string, name: string) {
  return `/system script add name=redzone-report dont-require-permissions=no source={
  :local url "${url}"
  :local token "${token}"
  :local nodeName "${name}"
  :local r [/system resource get]
  :local cpu ($r->"cpu-load")
  :local fm ($r->"free-memory")
  :local tm ($r->"total-memory")
  :local up [:tostr ($r->"uptime")]
  :local ver ($r->"version")
  :local memused 0
  :if ($tm > 0) do={ :set memused (100 - ($fm * 100 / $tm)) }
  :local ids [/ppp active find]
  :local sess [:len $ids]
  :local arr ""
  :local n 0
  :foreach i in=$ids do={
    :if ($n < 60) do={
      :local un [/ppp active get $i name]
      :local ad [/ppp active get $i address]
      :if ($n > 0) do={ :set arr ($arr . ",") }
      :set arr ($arr . "{\\"name\\":\\"$un\\",\\"address\\":\\"$ad\\"}")
      :set n ($n + 1)
    }
  }
  :local body "{\\"name\\":\\"$nodeName\\",\\"cpuLoad\\":$cpu,\\"memUsedPct\\":$memused,\\"uptime\\":\\"$up\\",\\"version\\":\\"$ver\\",\\"sessionCount\\":$sess,\\"sessions\\":[$arr]}"
  /tool fetch url=$url http-method=post mode=https check-certificate=no output=none \\
    http-header-field="x-agent-token: $token,Content-Type: application/json" \\
    http-data=$body
}
/system scheduler add name=redzone-report interval=1m on-event="/system script run redzone-report"
# Test now:  /system script run redzone-report`;
}

function AddDeviceModal({ onClose }: { onClose: () => void }) {
  const { data: setup, isLoading } = useNetworkSetup();
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);

  const script = setup ? buildScript(setup.reportUrl, setup.token, name.trim() || 'New Router') : '';

  async function copy() {
    try { await navigator.clipboard.writeText(script); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* clipboard may be blocked; the user can select manually */ }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Add a device</h2>
        <p className="mt-1 text-sm text-ink/50">
          Any MikroTik router can report itself to RedZone over the internet — no extra box, no VPN.
        </p>

        {isLoading ? (
          <div className="mt-4"><Spinner /></div>
        ) : !setup?.configured ? (
          <div className="mt-4 rounded-xl border border-warn/40 bg-warn/5 p-4 text-sm text-ink/70">
            Monitoring isn't switched on yet. Set an <span className="font-mono">AGENT_TOKEN</span> in Render
            (redzone-api → Environment) — a long random string — then reopen this.
          </div>
        ) : (
          <>
            <div className="mt-4">
              <label className="label">Name this device</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Barangay Tabun Tower" autoFocus />
              <p className="mt-1 text-xs text-ink/40">This is the label you'll see in the Network list.</p>
            </div>

            <ol className="mt-4 space-y-1.5 text-sm text-ink/70">
              <li><span className="font-600">1.</span> Open the new router in WinBox or WebFig → <span className="font-600">New Terminal</span>.</li>
              <li><span className="font-600">2.</span> Paste the whole script below and press Enter.</li>
              <li><span className="font-600">3.</span> Test it: run <span className="font-mono text-xs">/system script run redzone-report</span></li>
              <li><span className="font-600">4.</span> It appears here within about a minute, and refreshes every minute after.</li>
            </ol>

            <div className="mt-3">
              <div className="flex items-center justify-between">
                <label className="label">Script to paste</label>
                <button className="text-sm font-600 text-signal-600" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
              </div>
              <pre className="mt-1 max-h-56 overflow-auto rounded-xl bg-ink px-3 py-3 text-[11px] leading-relaxed text-white/90">{script}</pre>
              <p className="mt-2 text-xs text-ink/40">
                The token in this script is shared by all your devices — keep it private. To replace an old script on a
                router first run: <span className="font-mono">/system scheduler remove [find name=redzone-report]; /system script remove [find name=redzone-report]</span>
              </p>
            </div>

            <button className="btn-primary mt-4 w-full" onClick={onClose}>Done</button>
          </>
        )}
      </div>
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

function NodeCard({ node, canManage }: { node: NetworkNode; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const remove = useRemoveNetworkNode();
  const last = node.lastReportAt ? new Date(node.lastReportAt).toLocaleString('en-PH') : '—';

  function onRemove() {
    const warn = node.online
      ? `"${node.name}" is still online — if the router keeps running the report script it will reappear in a minute. Remove the card anyway?`
      : `Remove "${node.name}" from the list?`;
    if (window.confirm(warn)) remove.mutate(node.id);
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-700">{node.name}</p>
          <p className="text-xs text-ink/50">{node.host || '—'}{node.version ? ` · RouterOS ${node.version}` : ''} · up {node.uptime || '—'}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`pill ${node.online ? 'bg-good/10 text-good' : 'bg-bad/10 text-bad'}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />{node.online ? 'Online' : 'Offline'}
          </span>
          {canManage && (
            <button className="text-xs font-600 text-bad" onClick={onRemove} disabled={remove.isPending} title="Remove device">
              Remove
            </button>
          )}
        </div>
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
          <p className="mt-0.5 font-display text-lg font-700 text-signal-600">
            {node.sessionCount ?? '—'} <span className="text-xs font-500 text-ink/50">PPPoE</span>
          </p>
          <p className="text-xs text-ink/50">{node.hotspotCount ?? 0} hotspot</p>
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
            <li key={`${s.name}-${i}`} className="flex items-center justify-between gap-3 py-1.5">
              <div className="min-w-0">
                <p className="truncate font-600">{s.subscriberName || s.name}</p>
                <p className="truncate text-xs text-ink/50">
                  {s.subscriberName ? `${s.name}` : 'not linked to a subscriber'}
                  {s.accountNo ? ` · ${s.accountNo}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-ink/50">{s.address || ''}</span>
                {!s.subscriberName && (
                  <button className="text-xs font-600 text-signal-600" onClick={() => setLinking(s.name)}>Link</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {linking && <LinkSessionModal username={linking} onClose={() => setLinking(null)} />}
    </div>
  );
}

function LinkSessionModal({ username, onClose }: { username: string; onClose: () => void }) {
  const [q, setQ] = useState('');
  const { data } = useSubscribers({ q: q || undefined, take: 15 });
  const update = useUpdateSubscriber();
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);

  async function link(id: string) {
    setErr(null);
    try {
      await update.mutateAsync({ id, data: { pppoeUsername: username } });
      qc.invalidateQueries({ queryKey: ['network'] });
      onClose();
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErr(m || 'Could not link.');
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Link session</h2>
        <p className="mt-1 text-sm text-ink/50">Attach PPPoE user <span className="font-mono">{username}</span> to a subscriber.</p>
        <input className="input mt-3" placeholder="Search subscriber by name / account no."
          value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        {err && <p className="mt-2 text-sm text-bad">{err}</p>}
        <div className="mt-2 divide-y divide-line">
          {(data?.items ?? []).map((s) => (
            <button key={s.id} onClick={() => link(s.id)} disabled={update.isPending}
              className="flex w-full items-center justify-between py-2.5 text-left text-sm hover:bg-paper">
              <span className="truncate font-600">{s.fullName}</span>
              <span className="shrink-0 text-xs text-ink/40">{s.accountNo}{s.pppoeUsername ? ' · has PPPoE' : ''}</span>
            </button>
          ))}
          {q && (data?.items?.length ?? 0) === 0 && <p className="py-4 text-sm text-ink/40">No matches.</p>}
        </div>
      </div>
    </div>
  );
}
