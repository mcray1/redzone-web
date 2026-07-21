import { useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  useVendoSummary, useVendoCollections, useVendoExpenses, useVendoCoinTypes,
  useRecordCollection, useRecordVendoExpense,
} from '../hooks/queries';
import { peso } from '../api/types';
import { pesosToCentavos } from '../lib/money';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ error?: string }>;
  return e?.response?.data?.error || fallback;
}
function today() { return new Date().toISOString().slice(0, 10); }
function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }

export function VendoPanel({ subscriberId }: { subscriberId: string }) {
  const { hasPerm } = useAuth();
  const canView = hasPerm('vendo.view') || hasPerm('vendo.manage');
  const canManage = hasPerm('vendo.manage');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const range = { from, to };
  const { data: summary } = useVendoSummary(canView ? subscriberId : undefined, range);
  const { data: collections } = useVendoCollections(canView ? subscriberId : undefined, range);
  const { data: expenses } = useVendoExpenses(canView ? subscriberId : undefined, range);
  const [collectOpen, setCollectOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  if (!canView) return null;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-600">Vendo income</h2>
        {canManage && (
          <div className="flex gap-2">
            <button className="btn-ghost text-sm" onClick={() => setExpenseOpen(true)}>+ Expense</button>
            <button className="btn-primary text-sm" onClick={() => setCollectOpen(true)}>Record collection</button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <input className="input h-9 w-auto py-1" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-ink/30">–</span>
        <input className="input h-9 w-auto py-1" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button className="pill border border-line text-ink/60" onClick={() => { setFrom(monthStart()); setTo(today()); }}>This month</button>
        {(from || to) && <button className="pill border border-line text-ink/40" onClick={() => { setFrom(''); setTo(''); }}>All time</button>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="Gross" value={peso(summary?.grossCents ?? 0)} />
        <Mini label="Net" value={peso(summary?.netCents ?? 0)} accent />
        <Mini label="Expenses" value={peso(summary?.expenseCents ?? 0)} />
        <Mini label="Profit" value={peso(summary?.profitCents ?? 0)} accent />
      </div>

      {collections && collections.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-600 uppercase tracking-wide text-ink/40">Recent collections</p>
          <ul className="mt-1 divide-y divide-line">
            {collections.slice(0, 5).map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink/60">{new Date(c.date).toLocaleDateString('en-PH')} · gross {peso(c.grossCents)} · −{c.deductionPct}%</span>
                <span className="font-600">{peso(c.netCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {expenses && expenses.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-600 uppercase tracking-wide text-ink/40">Recent expenses</p>
          <ul className="mt-1 divide-y divide-line">
            {expenses.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <span className="truncate text-ink/60">{new Date(e.date).toLocaleDateString('en-PH')} · {e.category} — {e.description}</span>
                <span className="font-600 text-bad">{peso(e.amountCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {collectOpen && <CollectModal subscriberId={subscriberId} onClose={() => setCollectOpen(false)} />}
      {expenseOpen && <ExpenseModal subscriberId={subscriberId} onClose={() => setExpenseOpen(false)} />}
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs font-600 uppercase tracking-wide text-ink/40">{label}</p>
      <p className={`mt-0.5 font-display text-lg font-700 ${accent ? 'text-signal-600' : 'text-ink'}`}>{value}</p>
    </div>
  );
}

function CollectModal({ subscriberId, onClose }: { subscriberId: string; onClose: () => void }) {
  const { data: coins } = useVendoCoinTypes();
  const record = useRecordCollection();
  const [date, setDate] = useState(today());
  const [grams, setGrams] = useState<Record<string, string>>({});
  // ₱10/₱20 piles aren't weighed in practice — staff count them and enter the
  // total value directly.
  const [tens, setTens] = useState('');
  const [twenties, setTwenties] = useState('');
  const [pct, setPct] = useState('0');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);

  // Live preview using the current weights + direct amounts.
  const { gross, net } = useMemo(() => {
    let g = 0;
    for (const c of coins ?? []) {
      const grm = Number(grams[c.key] || 0);
      if (grm > 0 && c.gramsPerCoin > 0) g += Math.round(grm / c.gramsPerCoin) * c.faceCents;
    }
    g += pesosToCentavos(tens) + pesosToCentavos(twenties);
    const p = Math.min(100, Math.max(0, Number(pct) || 0));
    return { gross: g, net: g - Math.round((g * p) / 100) };
  }, [coins, grams, tens, twenties, pct]);

  const unsetCoins = (coins ?? []).filter((c) => !c.gramsPerCoin);

  async function submit() {
    setErr(null);
    const lines = (coins ?? [])
      .filter((c) => Number(grams[c.key] || 0) > 0)
      .map((c) => ({ key: c.key, grams: Number(grams[c.key]) }));
    const direct = [
      { label: '₱10 coins', amountCents: pesosToCentavos(tens) },
      { label: '₱20 coins', amountCents: pesosToCentavos(twenties) },
    ].filter((d) => d.amountCents > 0);
    if (!lines.length && !direct.length) { setErr('Enter a coin-pile weight or a ₱10/₱20 total.'); return; }
    try {
      await record.mutateAsync({ subscriberId, date, deductionPct: Number(pct) || 0, note: note || undefined, lines, direct });
      onClose();
    } catch (e) { setErr(apiError(e, 'Could not save the collection.')); }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Record collection</h2>
        <p className="mt-1 text-sm text-ink/50">Weigh each coin pile; the app converts weight to pesos.</p>

        {unsetCoins.length > 0 && (
          <p className="mt-3 rounded-lg bg-warn/10 px-3 py-2 text-xs text-ink/70">
            No weight set for {unsetCoins.map((c) => c.label).join(', ')} — set it under Vendo → Coin weights, or those piles will count as 0.
          </p>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Weight of each coin pile (grams)</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(coins ?? []).map((c) => (
                <div key={c.id}>
                  <input className="input" inputMode="decimal" placeholder={c.label}
                    value={grams[c.key] ?? ''} onChange={(e) => setGrams((g) => ({ ...g, [c.key]: e.target.value.replace(/[^0-9.]/g, '') }))} />
                  <p className="mt-0.5 text-[11px] text-ink/40">{c.label}{c.gramsPerCoin ? ` · ${c.gramsPerCoin.toFixed(2)}g` : ' · no weight'}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="label">₱10 / ₱20 coins — total value (₱)</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <div>
                <input className="input" inputMode="decimal" placeholder="₱10 total"
                  value={tens} onChange={(e) => setTens(e.target.value.replace(/[^0-9.]/g, ''))} />
                <p className="mt-0.5 text-[11px] text-ink/40">counted, not weighed</p>
              </div>
              <div>
                <input className="input" inputMode="decimal" placeholder="₱20 total"
                  value={twenties} onChange={(e) => setTwenties(e.target.value.replace(/[^0-9.]/g, ''))} />
                <p className="mt-0.5 text-[11px] text-ink/40">counted, not weighed</p>
              </div>
            </div>
          </div>
          <div>
            <label className="label">Deduct %</label>
            <input className="input" inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. collected by Mang Jun" />
          </div>

          <div className="rounded-xl bg-paper p-3 text-sm">
            <div className="flex justify-between"><span className="text-ink/60">Gross</span><span className="font-600">{peso(gross)}</span></div>
            <div className="flex justify-between"><span className="text-ink/60">Net after {Number(pct) || 0}%</span><span className="font-display text-lg font-700 text-signal-600">{peso(net)}</span></div>
          </div>

          {err && <p className="text-sm text-bad">{err}</p>}
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" onClick={submit} disabled={record.isPending}>{record.isPending ? 'Saving…' : 'Save collection'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpenseModal({ subscriberId, onClose }: { subscriberId: string; onClose: () => void }) {
  const record = useRecordVendoExpense();
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState('Electricity');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    const amountCents = Math.round(Number(amount) * 100);
    if (!description.trim() || !amountCents) { setErr('Enter a description and amount.'); return; }
    try {
      await record.mutateAsync({ subscriberId, date, category, description: description.trim(), amountCents });
      onClose();
    } catch (e) { setErr(apiError(e, 'Could not save the expense.')); }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Vendo expense</h2>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {['Electricity', 'Maintenance', 'Coins float', 'Rent / share', 'Other'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. monthly power" />
          </div>
          <div>
            <label className="label">Amount (₱)</label>
            <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          {err && <p className="text-sm text-bad">{err}</p>}
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" onClick={submit} disabled={record.isPending}>{record.isPending ? 'Saving…' : 'Save expense'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
