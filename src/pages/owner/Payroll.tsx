import { useState } from 'react';
import { SalaryPinGate } from '../../components/SalaryPinGate';
import { useStaffSalaries, useSetStaffSalary, useAdvancesQueue, useDecideAdvance,
  usePayrollRuns, usePayrollRun, useCreatePayrollRun, useUpdatePayslip, useFinalizePayroll } from '../../hooks/queries';
import { peso, type StaffSalary, type StaffSalaryRow, type SalaryAdvance, type SalaryType } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/ui';

// Running payroll and editing salaries is never delegated — owner/admin only.
// A manager may hold payroll.view (see the numbers) but not act on them.
function useCanManagePayroll() {
  const { user } = useAuth();
  return (user?.roles ?? [user?.role]).some((r) => r === 'OWNER' || r === 'ADMIN');
}

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
  const canManage = useCanManagePayroll();
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
            {pending.map((a) => <AdvanceRow key={a.id} adv={a} canManage={canManage} />)}
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
                {canManage && <button className="btn-ghost shrink-0" onClick={() => setEditing(s)}>Set salary</button>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <PayrollRuns pin={pin} canManage={canManage} />

      {editing && <SalaryModal pin={pin} row={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function PayrollRuns({ pin, canManage }: { pin: string; canManage: boolean }) {
  const { data: runs } = usePayrollRuns(pin);
  const create = useCreatePayrollRun(pin);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [openId, setOpenId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setErr(null);
    try {
      const r = await create.mutateAsync(period);
      setOpenId(r.id);
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErr(m || 'Could not create the run.');
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-display font-600">Payroll runs</h2>
      {canManage && (
        <div className="mt-3 flex gap-2">
          <input className="input" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          <button className="btn-primary shrink-0" disabled={create.isPending} onClick={generate}>
            {create.isPending ? '…' : 'Generate'}
          </button>
        </div>
      )}
      {err && <p className="mt-2 text-sm text-bad">{err}</p>}
      {runs && runs.length > 0 && (
        <ul className="mt-3 divide-y divide-line">
          {runs.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2.5">
              <button className="text-left" onClick={() => setOpenId(r.id)}>
                <span className="font-600">{r.period}</span>
                <span className="ml-2 text-xs text-ink/50">{r._count?.payslips ?? 0} payslips</span>
              </button>
              <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${r.status === 'FINALIZED' ? 'bg-good/10 text-good' : 'bg-signal/15 text-warn'}`}>
                {r.status.toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      )}
      {openId && <RunDetailModal pin={pin} id={openId} canManage={canManage} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function RunDetailModal({ pin, id, canManage, onClose }: { pin: string; id: string; canManage: boolean; onClose: () => void }) {
  const { data: run, isLoading } = usePayrollRun(pin, id);
  const updateSlip = useUpdatePayslip(pin);
  const finalize = useFinalizePayroll(pin);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {isLoading || !run ? (
          <Spinner />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-700">Payroll — {run.period}</h2>
              <button className="text-ink/40" onClick={onClose}>✕</button>
            </div>
            <ul className="mt-3">
              {run.payslips.map((p) => (
                <li key={p.id} className="border-t border-line py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-600">{p.staffName}</p>
                      <p className="text-xs text-ink/50">
                        {p.type === 'DAILY' ? `${peso(p.dailyRateCents)}/day` : 'Monthly'} · gross {peso(p.grossCents)}
                        {p.advanceDeductedCents > 0 && <span className="text-bad"> · advance −{peso(p.advanceDeductedCents)}</span>}
                      </p>
                    </div>
                    <span className="shrink-0 font-700">{peso(p.netCents)}</span>
                  </div>
                  {p.type === 'DAILY' && run.status === 'DRAFT' && canManage && (
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-ink/60">
                      <span>Days worked:</span>
                      <input className="input w-20 py-1" type="number" min={0} max={31} defaultValue={p.daysWorked}
                        onBlur={(e) => {
                          const d = Number(e.target.value);
                          if (d !== p.daysWorked) updateSlip.mutate({ id: p.id, daysWorked: d });
                        }} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-line pt-3">
              <span className="text-sm text-ink/60">Total net pay</span>
              <span className="font-display text-lg font-700">{peso(run.totals.net)}</span>
            </div>
            {run.status === 'DRAFT' ? (
              canManage && (
                <button className="btn-primary mt-4 w-full" disabled={finalize.isPending}
                  onClick={() => {
                    if (window.confirm('Finalize this payroll? Approved advances will be deducted and the run locked.')) {
                      finalize.mutate(run.id, { onSuccess: onClose });
                    }
                  }}>
                  {finalize.isPending ? 'Finalizing…' : 'Finalize payroll'}
                </button>
              )
            ) : (
              <p className="mt-4 text-center text-sm text-good">Finalized — advances deducted.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AdvanceRow({ adv, canManage }: { adv: SalaryAdvance; canManage: boolean }) {
  const decide = useDecideAdvance();
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate font-600">{adv.user?.name} — {peso(adv.amountCents)}</p>
        <p className="text-xs text-ink/50">{adv.user?.role}{adv.reason ? ` · ${adv.reason}` : ''}</p>
      </div>
      {canManage && (
        <div className="flex shrink-0 gap-2">
          <button className="btn-ghost text-bad" disabled={decide.isPending}
            onClick={() => decide.mutate({ id: adv.id, status: 'REJECTED' })}>Reject</button>
          <button className="btn-primary" disabled={decide.isPending}
            onClick={() => decide.mutate({ id: adv.id, status: 'APPROVED' })}>Approve</button>
        </div>
      )}
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
