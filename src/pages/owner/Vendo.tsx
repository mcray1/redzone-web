import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import {
  useVendoReport, useVendoCoinTypes, useSetCoinWeight, useCalibrateCoin,
  useCreateVendoSite, useCreateCoinType, useUpdateCoinType, useDeleteCoinType,
} from '../../hooks/queries';
import { useAuth } from '../../context/AuthContext';
import { peso, type VendoCoinType } from '../../api/types';
import { pesosToCentavos } from '../../lib/money';
import { Spinner, EmptyState } from '../../components/ui';
import { LocationSelect } from '../../components/LocationSelect';

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
  const { user, hasPerm } = useAuth();
  // Structure (adding sites, coin types) is owner/admin; recording is delegable.
  const canStructure = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const nav = useNavigate();
  const [coinsOpen, setCoinsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const t = data?.totals;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-700">Vendo</h1>
          <p className="text-sm text-ink/50">Coin income and expenses per WiFi vendo site. Kept separate from subscriber billing.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {hasPerm('vendo.manage') && <button className="btn-ghost" onClick={() => setCoinsOpen(true)}>Coin weights</button>}
          {canStructure && <button className="btn-primary" onClick={() => setAddOpen(true)}>+ Add site</button>}
        </div>
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
            <EmptyState title="No vendo sites yet" hint="Add your existing machines with “+ Add site”, or approve a WiFi Vendo registration." />
          ) : (
            <div className="card divide-y divide-line overflow-hidden">
              {data.rows.map((r) => (
                <button key={r.id} onClick={() => nav(`/owner/vendo/${r.id}`)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-paper">
                  <div className="min-w-0">
                    <p className="truncate font-600">
                      {r.vendoNumber && <span className="mr-1 text-signal-600">#{r.vendoNumber}</span>}
                      {r.vendoName || r.partnerName}
                    </p>
                    <p className="truncate text-xs text-ink/50">
                      {[r.sitio, r.barangay, r.municipality].filter(Boolean).join(', ') || r.accountNo}
                    </p>
                    <p className="truncate text-xs text-ink/40">Host: {r.partnerName}{r.phone ? ` · ${r.phone}` : ''}</p>
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
      {addOpen && <AddSiteModal onClose={() => setAddOpen(false)} onCreated={(id) => { setAddOpen(false); nav(`/owner/vendo/${id}`); }} />}
    </div>
  );
}

// Direct onboarding for a running business: enter an existing machine without
// the public application flow. Lands on the new site's page to record right away.
function AddSiteModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const create = useCreateVendoSite();
  const [vendoName, setVendoName] = useState('');
  const [vendoNumber, setVendoNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [barangay, setBarangay] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!vendoName.trim()) { setErr('Give the site a name.'); return; }
    try {
      const site = await create.mutateAsync({
        vendoName: vendoName.trim(),
        vendoNumber: vendoNumber.trim() || undefined,
        ownerName: ownerName.trim() || undefined,
        phone: phone.trim() || undefined,
        municipality: municipality || undefined,
        barangay: barangay || undefined,
      });
      onCreated(site.id);
    } catch (e) { setErr(apiError(e, 'Could not add the site.')); }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Add a vendo site</h2>
        <p className="mt-1 text-sm text-ink/50">For machines already running in the field. The account number is generated automatically.</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Site / machine name</label>
            <input className="input" value={vendoName} onChange={(e) => setVendoName(e.target.value)} placeholder="e.g. Mauy Store" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Machine # / VLAN</label>
              <input className="input" value={vendoNumber} onChange={(e) => setVendoNumber(e.target.value)} placeholder="e.g. 45" />
            </div>
            <div>
              <label className="label">Host / partner</label>
              <input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. Mauy" />
            </div>
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx" />
          </div>
          <LocationSelect municipality={municipality} barangay={barangay}
            onMunicipality={setMunicipality} onBarangay={setBarangay} />
          {err && <p className="text-sm text-bad">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" onClick={submit} disabled={create.isPending}>
              {create.isPending ? 'Adding…' : 'Add site'}
            </button>
          </div>
        </div>
      </div>
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
  const { user } = useAuth();
  const canStructure = user?.role === 'OWNER' || user?.role === 'ADMIN';
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Coin weights</h2>
        <p className="mt-1 text-sm text-ink/50">Set grams per coin, or calibrate by weighing a known count. Used to convert weight → pesos.</p>
        {isLoading ? <div className="mt-4"><Spinner /></div> : (
          <div className="mt-4 space-y-3">
            {coins?.map((c) => <CoinRow key={c.id} coin={c} canStructure={canStructure} />)}
            {canStructure && <AddCoinRow />}
          </div>
        )}
        <button className="btn-primary mt-4 w-full" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

function CoinRow({ coin, canStructure }: { coin: VendoCoinType; canStructure: boolean }) {
  const setWeight = useSetCoinWeight();
  const calibrate = useCalibrateCoin();
  const updateType = useUpdateCoinType();
  const deleteType = useDeleteCoinType();
  const [grams, setGrams] = useState(coin.gramsPerCoin ? String(coin.gramsPerCoin) : '');
  const [calCount, setCalCount] = useState('');
  const [calGrams, setCalGrams] = useState('');
  const [mode, setMode] = useState<'set' | 'cal' | 'edit'>('set');
  const [label, setLabel] = useState(coin.label);
  const [face, setFace] = useState(String(coin.faceCents / 100));
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setMsg(null);
    try {
      if (mode === 'set') {
        await setWeight.mutateAsync({ id: coin.id, gramsPerCoin: Number(grams) || 0 });
      } else if (mode === 'edit') {
        const faceCents = pesosToCentavos(face);
        if (!label.trim() || faceCents <= 0) { setMsg('Enter a label and a face value.'); return; }
        await updateType.mutateAsync({ id: coin.id, label: label.trim(), faceCents });
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

  async function remove() {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
    try { await deleteType.mutateAsync(coin.id); } catch (e) { setMsg(apiError(e, 'Could not remove.')); }
  }

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-center justify-between">
        <p className="font-600">{coin.label} <span className="text-xs font-400 text-ink/40">{peso(coin.faceCents)}</span></p>
        <span className="flex items-center gap-2 text-xs text-ink/40">
          {coin.gramsPerCoin ? `${coin.gramsPerCoin.toFixed(3)} g/coin` : 'not set'}
          {canStructure && (
            <button className={`pill border px-2 text-[11px] ${armed ? 'border-bad text-bad' : 'border-line text-ink/40'}`} onClick={remove}>
              {armed ? 'sure?' : 'remove'}
            </button>
          )}
        </span>
      </div>
      <div className="mt-2 flex gap-2 text-xs">
        <button className={`pill border ${mode === 'set' ? 'border-ink text-ink' : 'border-line text-ink/40'}`} onClick={() => setMode('set')}>Type grams</button>
        <button className={`pill border ${mode === 'cal' ? 'border-ink text-ink' : 'border-line text-ink/40'}`} onClick={() => setMode('cal')}>Calibrate</button>
        {canStructure && <button className={`pill border ${mode === 'edit' ? 'border-ink text-ink' : 'border-line text-ink/40'}`} onClick={() => setMode('edit')}>Edit</button>}
      </div>
      {mode === 'edit' ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="label" />
          <input className="input" inputMode="decimal" value={face} onChange={(e) => setFace(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="face value (₱)" />
          <button className="btn-ghost col-span-2" onClick={save} disabled={updateType.isPending}>Save</button>
        </div>
      ) : mode === 'set' ? (
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

// Add a coin type (e.g. a new BSP series or a token). History is safe: past
// collections keep their snapshotted values whatever happens to types later.
function AddCoinRow() {
  const create = useCreateCoinType();
  const [label, setLabel] = useState('');
  const [face, setFace] = useState('');
  const [grams, setGrams] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function add() {
    setMsg(null);
    const faceCents = pesosToCentavos(face);
    if (!label.trim() || faceCents <= 0) { setMsg('Enter a label and a face value.'); return; }
    try {
      await create.mutateAsync({ label: label.trim(), faceCents, gramsPerCoin: Number(grams) || 0 });
      setLabel(''); setFace(''); setGrams('');
      setMsg('Added ✓');
    } catch (e) { setMsg(apiError(e, 'Could not add the coin type.')); }
  }

  return (
    <div className="rounded-xl border border-dashed border-line p-3">
      <p className="text-xs font-600 uppercase tracking-wide text-ink/40">Add coin type</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="label e.g. ₱10" />
        <input className="input" inputMode="decimal" value={face} onChange={(e) => setFace(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="face (₱)" />
        <input className="input" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="g/coin (opt.)" />
      </div>
      <button className="btn-ghost mt-2 w-full" onClick={add} disabled={create.isPending}>
        {create.isPending ? 'Adding…' : 'Add'}
      </button>
      {msg && <p className="mt-1 text-xs text-ink/50">{msg}</p>}
    </div>
  );
}
