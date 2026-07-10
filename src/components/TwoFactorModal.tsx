import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { api } from '../api/client';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ error?: string }>;
  return e?.response?.data?.error || fallback;
}

/**
 * Two-factor (authenticator app) setup for the signed-in user. Enable: start
 * setup → add the key to Google Authenticator/Authy → confirm a code. Disable:
 * confirm a current code.
 */
export function TwoFactorModal({ onClose }: { onClose: () => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [secret, setSecret] = useState<string | null>(null); // shown during setup
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get('/auth/2fa').then((r) => setEnabled(r.data.enabled)).catch(() => setEnabled(false));
  }, []);

  async function startSetup() {
    setErr(null); setBusy(true);
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setSecret(data.secret);
    } catch (e) { setErr(apiError(e, 'Could not start setup.')); }
    finally { setBusy(false); }
  }

  async function confirmEnable() {
    setErr(null); setBusy(true);
    try {
      await api.post('/auth/2fa/enable', { code: code.trim() });
      setEnabled(true); setSecret(null); setCode(''); setMsg('Two-factor is now on.');
    } catch (e) { setErr(apiError(e, 'That code is wrong or expired.')); }
    finally { setBusy(false); }
  }

  async function disable() {
    setErr(null); setBusy(true);
    try {
      await api.post('/auth/2fa/disable', { code: code.trim() });
      setEnabled(false); setCode(''); setMsg('Two-factor turned off.');
    } catch (e) { setErr(apiError(e, 'That code is wrong or expired.')); }
    finally { setBusy(false); }
  }

  const codeInput = (
    <input className="input text-center text-xl tracking-[0.3em]" inputMode="numeric" maxLength={6}
      placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))} />
  );

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Two-factor authentication</h2>

        {enabled === null ? (
          <p className="mt-3 text-sm text-ink/50">Loading…</p>
        ) : enabled ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-good">✓ Two-factor is ON. You'll enter a code from your app at each sign-in.</p>
            <p className="text-sm text-ink/60">To turn it off, enter a current code:</p>
            {codeInput}
            {err && <p className="text-sm text-bad">{err}</p>}
            {msg && <p className="text-sm text-good">{msg}</p>}
            <button className="btn-ghost w-full text-bad" disabled={busy || code.length < 6} onClick={disable}>
              {busy ? 'Working…' : 'Turn off two-factor'}
            </button>
          </div>
        ) : secret ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-ink/60">1. In Google Authenticator / Authy, add an account → <span className="font-600">enter a setup key</span>:</p>
            <div className="rounded-lg bg-paper px-3 py-2 text-center">
              <p className="break-all font-mono text-sm tracking-wider">{secret}</p>
            </div>
            <p className="text-sm text-ink/60">2. Enter the 6-digit code it shows:</p>
            {codeInput}
            {err && <p className="text-sm text-bad">{err}</p>}
            <button className="btn-primary w-full" disabled={busy || code.length < 6} onClick={confirmEnable}>
              {busy ? 'Verifying…' : 'Turn on two-factor'}
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-ink/60">Add a second step at sign-in using an authenticator app (Google Authenticator, Authy). Recommended for owner/admin accounts.</p>
            {msg && <p className="text-sm text-good">{msg}</p>}
            {err && <p className="text-sm text-bad">{err}</p>}
            <button className="btn-primary w-full" disabled={busy} onClick={startSetup}>
              {busy ? 'Starting…' : 'Set up two-factor'}
            </button>
          </div>
        )}

        <button className="btn-ghost mt-3 w-full" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
