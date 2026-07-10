import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useVendoReport, useVendoCoinTypes, useSetCoinWeight, useCalibrateCoin } from '../../hooks/queries';
import { useAuth } from '../../context/AuthContext';
import { peso, type VendoCoinType } from '../../api/types';
import { Spinner, EmptyState } from '../../components/ui';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ error?: string }>;
  return e?.response?.data?.error || fallback;
}

function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Vendo() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, isLoading } = useVendoReport({ from, to });
  const { hasPerm } = useAuth();
  const nav = useNavigate();
  const [coinsOpen, setCoinsOpen] = useState(false);

  const t = data?.totals;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-700">Vendo</h1>
          <p className="text-sm text-ink/50">Coin income and expenses per WiFi vendo site. Kept separate from subscriber billing.</p>
        </div>
        {hasPerm('vendo.manage') && <button className="btn-ghost shrink-0" onClick={() => setCoinsOpen(true)}>Coin weights</button>}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label">From</label>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn-ghost" onClick={() => { setFrom(monthStart()); setTo(todayStr()); }}>This month</button>
        {(from || to) && <button className="btn-ghost text-ink/50" onClick={() => { setFrom(''); setTo(''); }}>All time</button>}
      </div>

      {isLoading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Gross collected" value={peso(t?.grossCents ?? 0)} />
            <Stat label="Net (after %)" value={peso(t?.netCents ?? 0)} accent />
            <Stat label="Expenses" value={peso(t?.expenseCents ?? 0)} />
            <Stat label="Profit" value={peso(t?.profitCents ?? 0)} accent />
          </div>

          {!data?.rows.length ? (
            <EmptyState title="No vendo sites yet" hint="Approve a WiFi Vendo registration, then record collections on that site's page." />
          ) : (
            <div className="card divide-y divide-line overflow-hidden">
              {data.rows.map((r) => (
                <button key={r.id} onClick={() => nav(`/owner/subscribers/${r.id}`)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-paper">
                  <div className="min-w-0">
                    <p className="truncate font-600">
                      {r.vendoNumber && <span className="mr-1 text-signal-600">#{r.vendoNumber}</span>}
                      {r.vendoName || r.fullName}
                    </p>
                    <p className="truncate text-xs text-ink/50">
                      {[r.sitio, r.barangay, r.municipality].filter(Boolean).join(', ') || r.accountNo}
                    </p>
                    <p className="truncate text-xs text-ink/40">Host: {r.fullName}{r.phone ? ` · ${r.phone}` : ''}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-600 text-good">{peso(r.profitCents)}</p>
                    <p className="text-xs text-ink/40">net {peso(r.netCents)} · exp {peso(r.expenseCents)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {coinsOpen && <CoinWeightsModal onClose={() => setCoinsOpen(false)} />}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-xs font-600 uppercase tracking-wide text-ink/50">{label}</p>
      <p className={`mt-1.5 font-display text-xl font-700 ${accent ? 'text-signal-600' : 'text-ink'}`}>{value}</p>
    </div>
  );
}

function CoinWeightsModal({ onClose }: { onClose: () => void }) {
  const { data: coins, isLoading } = useVendoCoinTypes();
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Coin weights</h2>
        <p className="mt-1 text-sm text-ink/50">Set grams per coin, or calibrate by weighing a known count. Used to convert weight → pesos.</p>
        {isLoading ? <div className="mt-4"><Spinner /></div> : (
          <div className="mt-4 space-y-3">
            {coins?.map((c) => <CoinRow key={c.id} coin={c} />)}
          </div>
        )}
        <button className="btn-primary mt-4 w-full" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

function CoinRow({ coin }: { coin: VendoCoinType }) {
  const setWeight = useSetCoinWeight();
  const calibrate = useCalibrateCoin();
  const [grams, setGrams] = useState(coin.gramsPerCoin ? String(coin.gramsPerCoin) : '');
  const [calCount, setCalCount] = useState('');
  const [calGrams, setCalGrams] = useState('');
  const [mode, setMode] = useState<'set' | 'cal'>('set');
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setMsg(null);
    try {
      if (mode === 'set') {
        await setWeight.mutateAsync({ id: coin.id, gramsPerCoin: Number(grams) || 0 });
      } else {
        const count = Number(calCount), tg = Number(calGrams);
        if (!count || !tg) { setMsg('Enter both a count and a total weight.'); return; }
        const res = await calibrate.mutateAsync({ id: coin.id, count, totalGrams: tg });
        setGrams(String(res.gramsPerCoin));
        setMode('set');
      }
      setMsg('Saved ✓');
    } catch (e) { setMsg(apiError(e, 'Could not save.')); }
  }

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-center justify-between">
        <p className="font-600">{coin.label}</p>
        <span className="text-xs text-ink/40">{coin.gramsPerCoin ? `${coin.gramsPerCoin.toFixed(3)} g/coin` : 'not set'}</span>
      </div>
      <div className="mt-2 flex gap-2 text-xs">
        <button className={`pill border ${mode === 'set' ? 'border-ink text-ink' : 'border-line text-ink/40'}`} onClick={() => setMode('set')}>Type grams</button>
        <button className={`pill border ${mode === 'cal' ? 'border-ink text-ink' : 'border-line text-ink/40'}`} onClick={() => setMode('cal')}>Calibrate</button>
      </div>
      {mode === 'set' ? (
        <div className="mt-2 flex gap-2">
          <input className="input" inputMode="decimal" placeholder="grams per coin" value={grams} onChange={(e) => setGrams(e.target.value.replace(/[^0-9.]/g, ''))} />
          <button className="btn-ghost shrink-0" onClick={save} disabled={setWeight.isPending}>Save</button>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input className="input" inputMode="numeric" placeholder="# of coins" value={calCount} onChange={(e) => setCalCount(e.target.value.replace(/[^0-9]/g, ''))} />
          <input className="input" inputMode="decimal" placeholder="total grams" value={calGrams} onChange={(e) => setCalGrams(e.target.value.replace(/[^0-9.]/g, ''))} />
          <button className="btn-ghost col-span-2" onClick={save} disabled={calibrate.isPending}>Compute &amp; save</button>
        </div>
      )}
      {msg && <p className="mt-1 text-xs text-ink/50">{msg}</p>}
    </div>
  );
}
