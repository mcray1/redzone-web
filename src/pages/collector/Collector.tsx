import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useSubscribers, useRecordPayment, useCollectorToday, useSetSubscriberStatus } from '../../hooks/queries';
import { peso, type Subscriber } from '../../api/types';
import { Logo, Spinner, StatusPill, SignalMark } from '../../components/ui';
import { ChangePasswordModal } from '../../components/ChangePasswordModal';

export default function Collector() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<'collect' | 'today'>('collect');
  const [pwOpen, setPwOpen] = useState(false);

  return (
    <div className="min-h-full bg-paper pb-24">
      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}
      <header className="bg-ink px-5 pb-5 pt-5 text-white">
        <div className="flex items-center justify-between">
          <Logo light />
          <div className="flex items-center gap-3">
            <button onClick={() => setPwOpen(true)} className="text-sm font-600 text-white/60">Password</button>
            <button onClick={logout} className="text-sm font-600 text-white/60">Sign out</button>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/50">Collector</p>
        <h1 className="font-display text-xl font-700">{user?.name}</h1>
      </header>

      <main className="mx-auto max-w-md px-4 py-5">
        {tab === 'collect' ? <CollectTab /> : <TodayTab />}
      </main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md border-t border-line bg-white"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <button onClick={() => setTab('collect')}
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-600 ${tab === 'collect' ? 'text-signal-600' : 'text-ink/50'}`}>
          <SignalMark className="h-5 w-5" />Collect
        </button>
        <button onClick={() => setTab('today')}
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-600 ${tab === 'today' ? 'text-signal-600' : 'text-ink/50'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round"/></svg>
          Today
        </button>
      </nav>
    </div>
  );
}

function CollectTab() {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Subscriber | null>(null);
  const { data, isLoading } = useSubscribers({ q: q || undefined, take: 20 });

  if (selected) return <CollectForm subscriber={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Find a customer</label>
        <input className="input text-base" placeholder="Name, account no., or phone"
          value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>

      {q && (isLoading ? <Spinner /> : (
        <div className="card divide-y divide-line overflow-hidden">
          {data?.items.length ? data.items.map((s) => (
            <button key={s.id} onClick={() => setSelected(s)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left active:bg-paper">
              <div className="min-w-0">
                <p className="truncate font-600">{s.fullName}</p>
                <p className="text-xs text-ink/50">{s.accountNo}</p>
              </div>
              {s.balanceCents > 0
                ? <span className="font-600 text-bad">{peso(s.balanceCents)}</span>
                : <StatusPill status={s.status} />}
            </button>
          )) : <p className="px-4 py-6 text-center text-sm text-ink/40">No matches.</p>}
        </div>
      ))}

      {!q && (
        <div className="card px-6 py-10 text-center">
          <SignalMark className="mx-auto h-8 w-8 text-ink/20" />
          <p className="mt-2 text-sm text-ink/50">Search for a customer to record a payment.</p>
        </div>
      )}
    </div>
  );
}

interface PayForm { amount: number; method: string; reference?: string; }

function CollectForm({ subscriber, onBack }: { subscriber: Subscriber; onBack: () => void }) {
  const pay = useRecordPayment();
  const setStatus = useSetSubscriberStatus();
  const [activated, setActivated] = useState(false);
  const [done, setDone] = useState<{ receiptNo: string } | null>(null);
  const { register, handleSubmit } = useForm<PayForm>({
    defaultValues: {
      amount: subscriber.balanceCents > 0 ? subscriber.balanceCents / 100 : undefined,
      method: 'CASH',
    },
  });

  const isPending = subscriber.status === 'PENDING_INSTALLATION' && !activated;

  async function submit(v: PayForm) {
    const r = await pay.mutateAsync({
      subscriberId: subscriber.id,
      amountCents: Math.round(Number(v.amount) * 100),
      method: v.method,
      reference: v.reference || undefined,
    });
    setDone({ receiptNo: r.receiptNo });
  }

  if (done) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-good/10 text-2xl text-good">✓</div>
        <h2 className="mt-3 font-display text-lg font-700">Payment recorded</h2>
        <p className="mt-1 text-sm text-ink/60">{subscriber.fullName}</p>
        <p className="mt-1 text-sm">Receipt <span className="font-mono">{done.receiptNo}</span></p>
        <button className="btn-primary mt-5 w-full" onClick={onBack}>Collect another</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm font-600 text-ink/50">← Back to search</button>
      <div className="card p-5">
        <p className="font-display text-lg font-700">{subscriber.fullName}</p>
        <p className="text-sm text-ink/50">{subscriber.accountNo}</p>
        <div className="mt-3 rounded-lg bg-paper p-3">
          <p className="text-xs font-600 uppercase tracking-wide text-ink/40">Balance due</p>
          <p className={`font-display text-2xl font-700 ${subscriber.balanceCents > 0 ? 'text-bad' : 'text-good'}`}>
            {peso(Math.max(0, subscriber.balanceCents))}
          </p>
        </div>
        {isPending && (
          <button
            className="btn-dark mt-3 w-full"
            onClick={() => setStatus.mutate({ id: subscriber.id, status: 'ACTIVE' }, { onSuccess: () => setActivated(true) })}
            disabled={setStatus.isPending}>
            {setStatus.isPending ? 'Activating…' : 'Mark as Active (installed)'}
          </button>
        )}
        {activated && (
          <p className="mt-2 text-center text-sm text-good">Subscriber activated.</p>
        )}
      </div>

      <form onSubmit={handleSubmit(submit)} className="card space-y-3 p-5">
        <div>
          <label className="label">Amount received (₱)</label>
          <input className="input text-base" type="number" step="0.01" min="0" inputMode="decimal"
            {...register('amount', { required: true })} />
        </div>
        <div>
          <label className="label">Method</label>
          <select className="input text-base" {...register('method')}>
            <option value="CASH">Cash</option>
            <option value="GCASH">GCash</option>
            <option value="MAYA">Maya</option>
            <option value="BANK">Bank transfer</option>
          </select>
        </div>
        <div>
          <label className="label">Reference (optional)</label>
          <input className="input text-base" {...register('reference')} placeholder="GCash ref, etc." />
        </div>
        <button className="btn-primary w-full" disabled={pay.isPending}>
          {pay.isPending ? 'Recording…' : 'Record payment'}
        </button>
      </form>
    </div>
  );
}

function TodayTab() {
  const { data, isLoading } = useCollectorToday();
  if (isLoading || !data) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="card p-5 text-center">
        <p className="text-xs font-600 uppercase tracking-wide text-ink/40">Collected today</p>
        <p className="mt-1 font-display text-3xl font-700 text-signal-600">{peso(data.totalCents)}</p>
        <p className="mt-1 text-sm text-ink/50">{data.count} payment{data.count === 1 ? '' : 's'}</p>
      </div>

      {Object.keys(data.byMethod).length > 0 && (
        <div className="card p-5">
          <h3 className="font-display font-600">By method</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {Object.entries(data.byMethod).map(([method, cents]) => (
              <li key={method} className="flex justify-between">
                <span className="text-ink/60">{method}</span>
                <span className="font-600">{peso(cents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-display font-600">Receipts today</h3>
        {data.payments.length ? (
          <ul className="mt-2 divide-y divide-line">
            {data.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-600">{p.subscriber.fullName}</p>
                  <p className="text-xs text-ink/50">{p.method} · {new Date(p.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className="font-600">{peso(p.amountCents)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-ink/40">No payments yet today.</p>}
      </div>
    </div>
  );
}
