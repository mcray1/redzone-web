import { useState } from 'react';
import { AxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import { useCpeConfigured, useCpeForSubscriber, useRebootCpe, useRefreshCpe, useSetCpeWifi, useSetCpePppoe } from '../hooks/queries';
import { Spinner } from './ui';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ error?: string }>;
  return e?.response?.data?.error || fallback;
}

function uptime(seconds?: number | null) {
  if (!seconds || seconds <= 0) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return [d && `${d}d`, h && `${h}h`, (!d && m) && `${m}m`].filter(Boolean).join(' ') || '<1m';
}

/**
 * Customer-equipment (CPE) panel powered by GenieACS. Renders nothing unless the
 * integration is switched on and the viewer may at least see devices. Full
 * control (reboot / WiFi / PPPoE) is gated behind cpe.manage.
 */
export function CpePanel({ subscriberId }: { subscriberId: string }) {
  const { hasPerm } = useAuth();
  const canView = hasPerm('cpe.view') || hasPerm('cpe.manage');
  const canManage = hasPerm('cpe.manage');

  const { data: configured } = useCpeConfigured(canView);
  const { data, isLoading } = useCpeForSubscriber(subscriberId, canView && configured === true);

  if (!canView || configured === false || configured === undefined) return null;

  const device = data?.device ?? null;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-600">Customer device</h2>
        {device && (
          <span className={`pill ${device.online ? 'bg-good/10 text-good' : 'bg-ink/10 text-ink/50'}`}>
            {device.online ? 'Online' : 'Offline'}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="mt-3"><Spinner /></div>
      ) : !device ? (
        <p className="mt-2 text-sm text-ink/40">
          {data?.reason === 'no-pppoe'
            ? 'Set a PPPoE username on this subscriber to match their device.'
            : 'No device is reporting for this subscriber yet.'}
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <Field label="Model" value={device.productClass || device.manufacturer || '—'} />
            <Field label="Serial" value={device.serial || '—'} />
            <Field label="WiFi name" value={device.ssid || '—'} />
            <Field label="Uptime" value={uptime(device.uptimeSeconds)} />
            <Field label="Firmware" value={device.software || '—'} />
            <Field label="Last seen" value={device.lastInform ? new Date(device.lastInform).toLocaleString('en-PH') : '—'} />
          </div>

          {canManage && <CpeControls subscriberId={subscriberId} currentSsid={device.ssid || ''} />}
        </>
      )}
    </div>
  );
}

function CpeControls({ subscriberId, currentSsid }: { subscriberId: string; currentSsid: string }) {
  const reboot = useRebootCpe();
  const refresh = useRefreshCpe();
  const setWifi = useSetCpeWifi();
  const setPppoe = useSetCpePppoe();

  const [ssid, setSsid] = useState(currentSsid);
  const [wifiPass, setWifiPass] = useState('');
  const [pppoeUser, setPppoeUser] = useState('');
  const [pppoePass, setPppoePass] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showPppoe, setShowPppoe] = useState(false);

  async function run(fn: () => Promise<unknown>, okText: string) {
    setMsg(null);
    try { await fn(); setMsg({ ok: true, text: okText }); }
    catch (e) { setMsg({ ok: false, text: apiError(e, 'That did not go through.') }); }
  }

  return (
    <div className="mt-5 space-y-4 border-t border-line pt-4">
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" disabled={reboot.isPending}
          onClick={() => { if (window.confirm('Reboot this customer’s device now?')) run(() => reboot.mutateAsync({ subscriberId }), 'Reboot sent.'); }}>
          {reboot.isPending ? 'Rebooting…' : 'Reboot device'}
        </button>
        <button className="btn-ghost" disabled={refresh.isPending}
          onClick={() => run(() => refresh.mutateAsync({ subscriberId }), 'Refresh requested.')}>
          {refresh.isPending ? 'Refreshing…' : 'Refresh status'}
        </button>
      </div>

      <div>
        <p className="label">WiFi settings</p>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          <input className="input" placeholder="WiFi name (SSID)" value={ssid} onChange={(e) => setSsid(e.target.value)} />
          <input className="input" placeholder="New WiFi password (min 8)" value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} />
        </div>
        <button className="btn-ghost mt-2" disabled={setWifi.isPending}
          onClick={() => run(() => setWifi.mutateAsync({ subscriberId, ssid: ssid || undefined, password: wifiPass || undefined }), 'WiFi update sent to the device.')}>
          {setWifi.isPending ? 'Applying…' : 'Apply WiFi'}
        </button>
      </div>

      {!showPppoe ? (
        <button className="text-sm font-600 text-signal-600" onClick={() => setShowPppoe(true)}>Change PPPoE credentials…</button>
      ) : (
        <div>
          <p className="label">PPPoE credentials</p>
          <p className="text-xs text-ink/40">Changing these can drop the connection until the device re-authenticates.</p>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            <input className="input" placeholder="PPPoE username" value={pppoeUser} onChange={(e) => setPppoeUser(e.target.value)} />
            <input className="input" placeholder="PPPoE password" value={pppoePass} onChange={(e) => setPppoePass(e.target.value)} />
          </div>
          <button className="btn-ghost mt-2" disabled={setPppoe.isPending}
            onClick={() => run(() => setPppoe.mutateAsync({ subscriberId, username: pppoeUser || undefined, password: pppoePass || undefined }), 'PPPoE update sent to the device.')}>
            {setPppoe.isPending ? 'Applying…' : 'Apply PPPoE'}
          </button>
        </div>
      )}

      {msg && <p className={`text-sm ${msg.ok ? 'text-good' : 'text-bad'}`}>{msg.text}</p>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-600 uppercase tracking-wide text-ink/40">{label}</p>
      <p className="mt-0.5 truncate text-ink/80">{value}</p>
    </div>
  );
}
