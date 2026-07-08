import { useState } from 'react';
import { SalaryPinGate } from './SalaryPinGate';
import { useMySalary, useRequestAdvance } from '../hooks/queries';
import { peso, type StaffSalary, type AdvanceStatus } from '../api/types';
import { Spinner } from './ui';

/** Staff-facing salary view + advance request, behind the salary PIN. */
export function MySalarySection() {
  return <SalaryPinGate>{(pin) => <MySalary pin={pin} />}</SalaryPinGate>;
}

function salaryLine(s: StaffSalary | null) {
  if (!s) return 'Not set yet';
  if (s.type === 'DAILY') return `${peso(s.baseCents)} / day`;
  return `${peso(s.baseCents + s.allowanceCents)} / month`;
}

const STATUS_STYLE: Record<AdvanceStatus, string> = {
  PENDING: 'bg-signal/15 text-warn',
  APPROVED: 'bg-good/10 text-good',
  REJECTED: 'bg-bad/10 text-bad',
};

function MySalary({ pin }: { pin: string }) {
  const { data, isLoading } = useMySalary(pin);
  const req = useRequestAdvance();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const pendingExists = data?.advances.some((a) => a.status === 'PENDING') ?? false;

  async function submit() {
    setErr(null);
    setMsg(null);
    const cents = Math.round(Number(amount || 0) * 100);
    if (cents <= 0) { setErr('Enter an amount.'); return; }
    try {
      await req.mutateAsync({ amountCents: cents, reason: reason || undefined });
      setMsg('Advance request submitted for approval.');
      setAmount('');
      setReason('');
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErr(m || 'Could not submit the request.');
    }
  }

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="text-xs font-600 uppercase tracking-wide text-ink/40">My salary</p>
        <p className="mt-1 font-display text-xl font-700">{salaryLine(data?.salary ?? null)}</p>
        {data && data.approvedTotal > 0 && (
          <p className="mt-1 text-xs text-ink/50">Advances taken: {peso(data.approvedTotal)}</p>
        )}
      </div>

      <div className="card p-4">
        <h3 className="font-600">Request an advance</h3>
        {pendingExists ? (
          <p className="mt-2 text-sm text-warn">You have a pending request awaiting approval.</p>
        ) : (
          <div className="mt-3 space-y-2">
            <input className="input" type="number" step="0.01" min="0" placeholder="Amount (₱)"
              value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className="input" placeholder="Reason (optional)"
              value={reason} onChange={(e) => setReason(e.target.value)} />
            {err && <p className="text-sm text-bad">{err}</p>}
            {msg && <p className="text-sm text-good">{msg}</p>}
            <button className="btn-primary w-full" disabled={req.isPending} onClick={submit}>
              {req.isPending ? 'Submitting…' : 'Request advance'}
            </button>
          </div>
        )}

        {data && data.advances.length > 0 && (
          <ul className="mt-4 divide-y divide-line">
            {data.advances.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <span>{peso(a.amountCents)}{a.reason ? ` · ${a.reason}` : ''}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${STATUS_STYLE[a.status]}`}>
                  {a.status.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
