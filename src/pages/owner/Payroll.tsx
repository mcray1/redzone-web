import { useState } from 'react';
import { SalaryPinGate } from '../../components/SalaryPinGate';
import { useStaffSalaries, useSetStaffSalary, useAdvancesQueue, useDecideAdvance } from '../../hooks/queries';
import { peso, type StaffSalary, type StaffSalaryRow, type SalaryAdvance, type SalaryType } from '../../api/types';
import { Spinner } from '../../components/ui';

export default function Payroll() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-700">Payroll</h1>
        <p className="text-sm text-ink/50">Staff salaries and advance requests.</p>
      </div>
      <SalaryPinGate>{(pin) => <PayrollContent pin={pin} />}</SalaryPinGate>
    </div>
  );
}

function salaryLabel(s: StaffSalary | null) {
  if (!s) return 'No salary set';
  if (s.type === 'DAILY') return `${peso(s.baseCents)}/day`;
  return `${peso(s.baseCents + s.allowanceCents)}/mo`;
}

function PayrollContent({ pin }: { pin: string }) {
  const { data: staff, isLoading } = useStaffSalaries(pin);
  const { data: pending } = useAdvancesQueue(pin, 'PENDING');
  const [editing, setEditing] = useState<StaffSalaryRow | null>(null);

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h2 className="font-display font-600">Advance requests</h2>
        {!pending?.length ? (
          <p className="mt-2 text-sm text-ink/40">No pending requests.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {pending.map((a) => <AdvanceRow key={a.id} adv={a} />)}
          </ul>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-display font-600">Staff salaries</h2>
        {isLoading ? (
          <Spinner />
        ) : !staff?.length ? (
          <p className="mt-2 text-sm text-ink/40">No collectors or technicians yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {staff.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-600">{s.name}</p>
                  <p className="text-xs text-ink/50">
                    {s.role} · {salaryLabel(s.salary)}
                    {s.approvedAdvanceTotal > 0 && <> · advanced {peso(s.approvedAdvanceTotal)}</>}
                  </p>
                </div>
                <button className="btn-ghost shrink-0" onClick={() => setEditing(s)}>Set salary</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && <SalaryModal pin={pin} row={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function AdvanceRow({ adv }: { adv: SalaryAdvance }) {
  const decide = useDecideAdvance();
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate font-600">{adv.user?.name} — {peso(adv.amountCents)}</p>
        <p className="text-xs text-ink/50">{adv.user?.role}{adv.reason ? ` · ${adv.reason}` : ''}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button className="btn-ghost text-bad" disabled={decide.isPending}
          onClick={() => decide.mutate({ id: adv.id, status: 'REJECTED' })}>Reject</button>
        <button className="btn-primary" disabled={decide.isPending}
          onClick={() => decide.mutate({ id: adv.id, status: 'APPROVED' })}>Approve</button>
      </div>
    </li>
  );
}

function SalaryModal({ pin, row, onClose }: { pin: string; row: StaffSalaryRow; onClose: () => void }) {
  const save = useSetStaffSalary(pin);
  const [type, setType] = useState<SalaryType>(row.salary?.type ?? 'MONTHLY');
  const [base, setBase] = useState(row.salary ? String(row.salary.baseCents / 100) : '');
  const [allowance, setAllowance] = useState(row.salary ? String(row.salary.allowanceCents / 100) : '');
  const [notes, setNotes] = useState(row.salary?.notes ?? '');
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    try {
      await save.mutateAsync({
        userId: row.id,
        type,
        baseCents: Math.round(Number(base || 0) * 100),
        allowanceCents: type === 'MONTHLY' ? Math.round(Number(allowance || 0) * 100) : 0,
        notes: notes || undefined,
      });
      onClose();
    } catch {
      setErr('Could not save the salary.');
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Salary — {row.name}</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Pay type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as SalaryType)}>
              <option value="MONTHLY">Monthly (base + allowance)</option>
              <option value="DAILY">Daily rate</option>
            </select>
          </div>
          <div>
            <label className="label">{type === 'DAILY' ? 'Daily rate (₱)' : 'Monthly base (₱)'}</label>
            <input className="input" type="number" step="0.01" min="0" value={base}
              onChange={(e) => setBase(e.target.value)} />
          </div>
          {type === 'MONTHLY' && (
            <div>
              <label className="label">Monthly allowance (₱)</label>
              <input className="input" type="number" step="0.01" min="0" value={allowance}
                onChange={(e) => setAllowance(e.target.value)} />
            </div>
          )}
          <div>
            <label className="label">Notes (optional)</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {err && <p className="text-sm text-bad">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" disabled={save.isPending} onClick={submit}>
              {save.isPending ? 'Saving…' : 'Save salary'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
