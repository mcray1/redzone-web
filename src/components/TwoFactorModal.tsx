import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { api } from '../api/client';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ error?: string }>;
  return e?.response?.data?.error || fallback;
}

/**
 * Two-factor (authenticator app) setup for the signed-in user, with one-time
 * recovery codes so a lost phone doesn't mean a lockout.
 */
export function TwoFactorModal({ onClose }: { onClose: () => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [secret, setSecret] = useState<string | null>(null);   // shown during setup
  const [recovery, setRecovery] = useState<string[] | null>(null); // shown once
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get('/auth/2fa').then((r) => { setEnabled(r.data.enabled); setRemaining(r.data.recoveryRemaining ?? 0); }).catch(() => setEnabled(false));
  }, []);

  async function startSetup() {
    setErr(null); setBusy(true);
    try { const { data } = await api.post('/auth/2fa/setup'); setSecret(data.secret); }
    catch (e) { setErr(apiError(e, 'Could not start setup.')); }
    finally { setBusy(false); }
  }

  async function confirmEnable() {
    setErr(null); setBusy(true);
    try {
      const { data } = await api.post('/auth/2fa/enable', { code: code.trim() });
      setEnabled(true); setSecret(null); setCode('');
      setRecovery(data.recoveryCodes || []); setRemaining((data.recoveryCodes || []).length);
    } catch (e) { setErr(apiError(e, 'That code is wrong or expired.')); }
    finally { setBusy(false); }
  }

  async function regenerate() {
    setErr(null); setBusy(true);
    try {
      const { data } = await api.post('/auth/2fa/recovery-codes', { code: code.trim() });
      setCode(''); setRecovery(data.recoveryCodes || []); setRemaining((data.recoveryCodes || []).length);
    } catch (e) { setErr(apiError(e, 'That code is wrong or expired.')); }
    finally { setBusy(false); }
  }

  async function disable() {
    setErr(null); setBusy(true);
    try { await api.post('/auth/2fa/disable', { code: code.trim() }); setEnabled(false); setCode(''); setRemaining(0); }
    catch (e) { setErr(apiError(e, 'That code is wrong or expired.')); }
    finally { setBusy(false); }
  }

  function copyCodes() {
    if (recovery) navigator.clipboard?.writeText(recovery.join('\n')).catch(() => {});
  }

  const codeInput = (
    <input className="input text-center text-xl tracking-[0.3em]" inputMode="numeric" maxLength={6}
      placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))} />
  );

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Two-factor authentication</h2>

        {recovery ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-good">✓ Two-factor is on. Save these <span className="font-600">backup codes</span> somewhere safe — each works once if you lose your phone.</p>
            <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-paper p-3 font-mono text-sm">
              {recovery.map((c) => <span key={c} className="text-center">{c}</span>)}
            </div>
            <button className="btn-ghost w-full" onClick={copyCodes}>Copy codes</button>
            <button className="btn-primary w-full" onClick={() => setRecovery(null)}>I've saved them</button>
          </div>
        ) : enabled === null ? (
          <p className="mt-3 text-sm text-ink/50">Loading…</p>
        ) : enabled ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-good">✓ Two-factor is ON. You'll enter a code at each sign-in.</p>
            <p className="text-xs text-ink/50">Backup codes remaining: <span className="font-600">{remaining}</span></p>
            <p className="text-sm text-ink/60">Enter a current code to make a change:</p>
            {codeInput}
            {err && <p className="text-sm text-bad">{err}</p>}
            <button className="btn-ghost w-full" disabled={busy || code.length < 6} onClick={regenerate}>
              {busy ? 'Working…' : 'Regenerate backup codes'}
            </button>
            <button className="btn-ghost w-full text-bad" disabled={busy || code.length < 6} onClick={disable}>
              Turn off two-factor
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
            {err && <p className="text-sm text-bad">{err}</p>}
            <button className="btn-primary w-full" disabled={busy} onClick={startSetup}>
              {busy ? 'Starting…' : 'Set up two-factor'}
            </button>
          </div>
        )}

        {!recovery && <button className="btn-ghost mt-3 w-full" onClick={onClose}>Close</button>}
      </div>
    </div>
  );
}
