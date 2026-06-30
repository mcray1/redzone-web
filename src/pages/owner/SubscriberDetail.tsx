import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSubscriber, useRecordPayment } from '../../hooks/queries';
import { peso } from '../../api/types';
import { Spinner, StatusPill } from '../../components/ui';

export default function SubscriberDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: s, isLoading } = useSubscriber(id);
  const [payOpen, setPayOpen] = useState(false);

  if (isLoading || !s) return <Spinner />;

  return (
    <div className="space-y-5">
      <button onClick={() => nav(-1)} className="text-sm font-600 text-ink/50">← Back</button>

      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl font-700">{s.fullName}</h1>
            <p className="text-sm text-ink/50">{s.accountNo}</p>
          </div>
          <StatusPill status={s.status} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <Field label="Plan" value={s.servicePlan?.name ?? '—'} />
          <Field label="Monthly" value={s.servicePlan ? peso(s.servicePlan.priceCents) : '—'} />
          <Field label="Balance" value={peso(s.balanceCents)} danger={s.balanceCents > 0} />
          <Field label="Due day" value={`Day ${s.dueDay}`} />
          <Field label="Phone" value={s.phone ?? '—'} />
          <Field label="Email" value={s.email ?? '—'} />
          <Field label="Barangay" value={s.barangay ?? '—'} />
          <Field label="Municipality" value={s.municipality ?? '—'} />
        </div>

        <button className="btn-primary mt-5 w-full md:w-auto" onClick={() => setPayOpen(true)}>
          Record payment
        </button>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-600">Payment history</h2>
        {s.payments?.length ? (
          <ul className="mt-3 divide-y divide-line">
            {s.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-600">{peso(p.amountCents)}</p>
                  <p className="text-xs text-ink/50">
                    {p.method} · {new Date(p.createdAt).toLocaleDateString('en-PH')}
                  </p>
                </div>
                <span className="text-xs font-mono text-ink/40">{p.receiptNo}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink/40">No payments recorded yet.</p>
        )}
      </div>

      {payOpen && <PaymentModal subscriberId={s.id} balanceCents={s.balanceCents} onClose={() => setPayOpen(false)} />}
    </div>
  );
}

function Field({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-xs font-600 uppercase tracking-wide text-ink/40">{label}</p>
      <p className={`mt-0.5 font-500 ${danger ? 'text-bad' : 'text-ink'}`}>{value}</p>
    </div>
  );
}

interface PayVals { amount: number; method: string; reference?: string; }

function PaymentModal({ subscriberId, balanceCents, onClose }:
  { subscriberId: string; balanceCents: number; onClose: () => void }) {
  const pay = useRecordPayment();
  const [result, setResult] = useState<{ receiptNo: string; restored: boolean } | null>(null);
  const { register, handleSubmit } = useForm<PayVals>({
    defaultValues: { amount: balanceCents > 0 ? balanceCents / 100 : undefined, method: 'CASH' },
  });

  async function submit(vals: PayVals) {
    const r = await pay.mutateAsync({
      subscriberId,
      amountCents: Math.round(Number(vals.amount) * 100),
      method: vals.method,
      reference: vals.reference || undefined,
    });
    setResult({ receiptNo: r.receiptNo, restored: r.restored });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {result ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-good/10 text-good">✓</div>
            <h2 className="mt-3 font-display text-lg font-700">Payment recorded</h2>
            <p className="mt-1 text-sm text-ink/60">Receipt <span className="font-mono">{result.receiptNo}</span></p>
            {result.restored && <p className="mt-1 text-sm text-good">Service restored automatically.</p>}
            <button className="btn-dark mt-5 w-full" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <h2 className="font-display text-lg font-700">Record payment</h2>
            <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-3">
              <div>
                <label className="label">Amount (₱)</label>
                <input className="input" type="number" step="0.01" min="0"
                  {...register('amount', { required: true })} />
              </div>
              <div>
                <label className="label">Method</label>
                <select className="input" {...register('method')}>
                  <option value="CASH">Cash</option>
                  <option value="GCASH">GCash</option>
                  <option value="MAYA">Maya</option>
                  <option value="BANK">Bank transfer</option>
                </select>
              </div>
              <div>
                <label className="label">Reference (optional)</label>
                <input className="input" {...register('reference')} placeholder="GCash ref no., etc." />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
                <button className="btn-primary flex-1" disabled={pay.isPending}>
                  {pay.isPending ? 'Saving…' : 'Record'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
