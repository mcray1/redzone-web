import { useState } from 'react';
import { useSubmitExpense, useMyExpenses } from '../hooks/queries';
import { peso, type ExpenseStatus } from '../api/types';
import { todayStamp } from '../lib/csv';
import { Spinner } from './ui';

const CATEGORIES = ['Fuel / transport', 'Equipment', 'Repairs', 'Office supplies', 'Load / data', 'Miscellaneous'];
const STATUS_STYLE: Record<ExpenseStatus, string> = {
  PENDING: 'bg-signal/15 text-warn',
  APPROVED: 'bg-good/10 text-good',
  REJECTED: 'bg-bad/10 text-bad',
};

/** Staff-facing: submit an expense request (needs office approval) + see mine. */
export function StaffExpenses() {
  const submit = useSubmitExpense();
  const { data: mine, isLoading } = useMyExpenses();
  const [date, setDate] = useState(todayStamp());
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    setErr(null);
    setMsg(null);
    const cents = Math.round(Number(amount || 0) * 100);
    if (cents <= 0) { setErr('Enter an amount.'); return; }
    if (!description.trim()) { setErr('Enter a description.'); return; }
    try {
      await submit.mutateAsync({ date, category, description: description.trim(), amountCents: cents });
      setMsg('Submitted for approval.');
      setAmount('');
      setDescription('');
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErr(m || 'Could not submit.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="font-600">Submit an expense</h3>
        <p className="text-xs text-ink/50">Goes to the office for approval before it counts.</p>
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input className="input" type="number" step="0.01" min="0" placeholder="Amount (₱)"
              value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="input" placeholder="What was it for?"
            value={description} onChange={(e) => setDescription(e.target.value)} />
          {err && <p className="text-sm text-bad">{err}</p>}
          {msg && <p className="text-sm text-good">{msg}</p>}
          <button className="btn-primary w-full" disabled={submit.isPending} onClick={go}>
            {submit.isPending ? 'Submitting…' : 'Submit expense'}
          </button>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-600">My requests</h3>
        {isLoading ? (
          <Spinner />
        ) : !mine || mine.length === 0 ? (
          <p className="mt-2 text-sm text-ink/40">No expense requests yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {mine.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-600">{peso(e.amountCents)}</span>
                  <span className="text-ink/50"> · {e.category}</span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${STATUS_STYLE[e.status ?? 'PENDING']}`}>
                  {(e.status ?? 'PENDING').toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
