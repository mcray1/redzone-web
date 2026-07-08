import { useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { useSalaryStatus, useSetSalaryPin } from '../hooks/queries';
import { Spinner } from './ui';

/**
 * Guards salary/payroll views behind a PIN. Shows a "set a PIN" form the first
 * time, an "enter PIN" form afterwards, and only renders its children once the
 * PIN is verified against the server. The verified PIN is passed to children so
 * their salary requests can include it.
 */
export function SalaryPinGate({ children }: { children: (pin: string) => ReactNode }) {
  const { data: status, isLoading } = useSalaryStatus();
  const setPin = useSetSalaryPin();
  const [unlocked, setUnlocked] = useState<string | null>(null);
  const [entry, setEntry] = useState('');
  const [confirmEntry, setConfirmEntry] = useState('');
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (isLoading || !status) return <Spinner />;
  if (unlocked) return <>{children(unlocked)}</>;

  async function verifyAndOpen(candidate: string) {
    setErr(null);
    setChecking(true);
    try {
      await api.get('/salary/me', { headers: { 'x-salary-pin': candidate } });
      setUnlocked(candidate);
    } catch {
      setErr('Wrong PIN. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  async function createPin() {
    setErr(null);
    if (!/^\d{4,8}$/.test(entry)) { setErr('PIN must be 4–8 digits.'); return; }
    if (entry !== confirmEntry) { setErr('The PINs do not match.'); return; }
    try {
      await setPin.mutateAsync({ pin: entry });
      setUnlocked(entry);
    } catch {
      setErr('Could not set the PIN.');
    }
  }

  return (
    <div className="card mx-auto max-w-sm p-5">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-ink/5 text-ink/60">🔒</div>
      {!status.hasPin ? (
        <>
          <h2 className="text-center font-display text-lg font-700">Set a salary PIN</h2>
          <p className="mt-1 text-center text-sm text-ink/50">
            Choose a 4–8 digit PIN. You'll enter it each time you open salary info, so no one else can peek.
          </p>
          <div className="mt-4 space-y-3">
            <input className="input" type="password" inputMode="numeric" placeholder="New PIN"
              value={entry} onChange={(e) => setEntry(e.target.value)} />
            <input className="input" type="password" inputMode="numeric" placeholder="Confirm PIN"
              value={confirmEntry} onChange={(e) => setConfirmEntry(e.target.value)} />
            {err && <p className="text-sm text-bad">{err}</p>}
            <button className="btn-primary w-full" disabled={setPin.isPending} onClick={createPin}>
              {setPin.isPending ? 'Saving…' : 'Set PIN & open'}
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-center font-display text-lg font-700">Enter salary PIN</h2>
          <p className="mt-1 text-center text-sm text-ink/50">This keeps salary figures private.</p>
          <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); verifyAndOpen(entry); }}>
            <input className="input" type="password" inputMode="numeric" placeholder="PIN" autoFocus
              value={entry} onChange={(e) => setEntry(e.target.value)} />
            {err && <p className="text-sm text-bad">{err}</p>}
            <button className="btn-primary w-full" disabled={checking}>
              {checking ? 'Checking…' : 'Open'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
