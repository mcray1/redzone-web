import { useState } from 'react';
import { AxiosError } from 'axios';
import {
  useVendors, useSaveVendor, useVendorBills, usePayablesAging, useCreateBill, usePayBill, useVoidBill,
  usePeriods, useClosePeriod, useReopenPeriod,
  useAssets, useSaveAsset, useDisposeAsset,
  useCreditNotes, useCreateCreditNote,
  useBankAccounts, useSaveBankAccount, useUnreconciled, useReconcile,
  useCashflow, usePosition, useSubscribers,
  type VendorBill, type FixedAssetRow,
} from '../../hooks/queries';
import { useAuth } from '../../context/AuthContext';
import { peso } from '../../api/types';
import { pesosToCentavos } from '../../lib/money';
import { Spinner, EmptyState } from '../../components/ui';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ error?: string }>;
  return e?.response?.data?.error || fallback;
}
function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function thisPeriod() { return todayStr().slice(0, 7); }

const TABS = ['Overview', 'Payables', 'Periods', 'Assets', 'Credit notes', 'Bank'] as const;
type Tab = typeof TABS[number];

// Owner screens for the P3 accounting suite (AP, period close, depreciation,
// credit notes, bank recon, cash flow / position). API-only until now.
export default function Accounting() {
  const [tab, setTab] = useState<Tab>('Overview');
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-700">Accounting</h1>
        <p className="text-sm text-ink/50">Payables, period close, assets, credit notes, and bank reconciliation.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pill whitespace-nowrap border ${tab === t ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink/60'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Overview' && <OverviewTab />}
      {tab === 'Payables' && <PayablesTab />}
      {tab === 'Periods' && <PeriodsTab />}
      {tab === 'Assets' && <AssetsTab />}
      {tab === 'Credit notes' && <CreditNotesTab />}
      {tab === 'Bank' && <BankTab />}
    </div>
  );
}

// ---- Overview: position + cash flow ---------------------------------------

function OverviewTab() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const { data: pos } = usePosition();
  const { data: cf, isLoading } = useCashflow({ from, to });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Receivables (owed to you)" value={peso(pos?.receivablesCents ?? 0)} />
        <Stat label="Payables (you owe)" value={peso(pos?.payablesCents ?? 0)} />
        <Stat label="Customer credits held" value={peso(pos?.customerCreditsCents ?? 0)} />
        <Stat label="Asset book value" value={peso(pos?.fixedAssetBookValueCents ?? 0)} />
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display font-600">Cash flow</h2>
          <div className="flex items-end gap-2">
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="pb-2 text-ink/40">–</span>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {isLoading || !cf ? <div className="mt-4"><Spinner /></div> : (
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Collections in" value={peso(cf.inflowsCents)} good />
            <Row label="Operating expenses" value={`− ${peso(cf.outflows.expenseCents)}`} />
            <Row label="Vendor bill payments" value={`− ${peso(cf.outflows.vendorPaymentCents)}`} />
            <Row label="Customer refunds" value={`− ${peso(cf.outflows.refundCents)}`} />
            <div className="border-t border-line pt-2">
              <Row label="Net cash" value={peso(cf.netCents)} strong good={cf.netCents >= 0} bad={cf.netCents < 0} />
            </div>
          </div>
        )}
        <p className="mt-3 text-xs text-ink/40">Management figures — a true balance sheet needs the general ledger (see GL_DESIGN.md).</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-xs font-600 uppercase tracking-wide text-ink/50">{label}</p>
      <p className="mt-1.5 font-display text-xl font-700">{value}</p>
    </div>
  );
}
function Row({ label, value, strong, good, bad }: { label: string; value: string; strong?: boolean; good?: boolean; bad?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? 'font-600' : 'text-ink/60'}>{label}</span>
      <span className={`${strong ? 'font-display font-700' : 'font-600'} ${good ? 'text-good' : bad ? 'text-bad' : ''}`}>{value}</span>
    </div>
  );
}

// ---- Payables: vendors, bills, aging ---------------------------------------

function PayablesTab() {
  const [status, setStatus] = useState('');
  const { data: bills, isLoading } = useVendorBills(status ? { status } : undefined);
  const { data: aging } = usePayablesAging();
  const [billOpen, setBillOpen] = useState(false);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [paying, setPaying] = useState<VendorBill | null>(null);
  const voidBill = useVoidBill();
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {aging && aging.count > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Not yet due" value={peso(aging.buckets.current)} />
          <Stat label="1–30 days overdue" value={peso(aging.buckets.d1_30)} />
          <Stat label="31–60 days" value={peso(aging.buckets.d31_60)} />
          <Stat label="60+ days" value={peso(aging.buckets.d60plus)} />
        </div>
      )}

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display font-600">Vendor bills</h2>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setVendorOpen(true)}>Vendors</button>
            <button className="btn-primary" onClick={() => setBillOpen(true)}>+ Bill</button>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {[['', 'All'], ['UNPAID', 'Unpaid'], ['PARTIAL', 'Partial'], ['PAID', 'Paid']].map(([k, label]) => (
            <button key={k} onClick={() => setStatus(k)}
              className={`pill border ${status === k ? 'border-ink bg-ink text-white' : 'border-line text-ink/60'}`}>{label}</button>
          ))}
        </div>
        {err && <p className="mt-2 text-sm text-bad">{err}</p>}
        {isLoading ? <div className="mt-4"><Spinner /></div> : !bills?.length ? (
          <p className="mt-4 text-sm text-ink/40">No bills{status ? ' with this status' : ' yet — record your upstream bandwidth bill with “+ Bill”'}.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {bills.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-600">{b.vendorName} — {b.description}</p>
                  <p className="text-xs text-ink/50">
                    due {new Date(b.dueDate).toLocaleDateString('en-PH')} · {peso(b.amountCents)}
                    {b.paidCents > 0 && <> · paid {peso(b.paidCents)}</>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`pill text-[10px] ${b.status === 'PAID' ? 'bg-good/10 text-good' : b.status === 'PARTIAL' ? 'bg-signal/15 text-warn' : 'bg-bad/10 text-bad'}`}>
                    {b.status.toLowerCase()}
                  </span>
                  {b.status !== 'PAID' && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setPaying(b)}>Pay</button>}
                  {b.paidCents === 0 && (
                    <TwoTap label="void" onFire={async () => {
                      setErr(null);
                      try { await voidBill.mutateAsync(b.id); } catch (e) { setErr(apiError(e, 'Could not void the bill.')); }
                    }} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {billOpen && <AddBillModal onClose={() => setBillOpen(false)} />}
      {vendorOpen && <VendorsModal onClose={() => setVendorOpen(false)} />}
      {paying && <PayBillModal bill={paying} onClose={() => setPaying(null)} />}
    </div>
  );
}

// Two-tap destructive button (same pattern as the coin-type remove).
function TwoTap({ label, onFire }: { label: string; onFire: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      className={`pill border px-2 text-[11px] ${armed ? 'border-bad text-bad' : 'border-line text-ink/40'}`}
      onClick={() => {
        if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
        onFire();
      }}
    >
      {armed ? 'sure?' : label}
    </button>
  );
}

function VendorsModal({ onClose }: { onClose: () => void }) {
  const { data: vendors, isLoading } = useVendors();
  const save = useSaveVendor();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    setErr(null);
    if (!name.trim()) { setErr('Enter a vendor name.'); return; }
    try { await save.mutateAsync({ name: name.trim(), contact: contact.trim() || undefined }); setName(''); setContact(''); }
    catch (e) { setErr(apiError(e, 'Could not save the vendor.')); }
  }

  return (
    <Modal title="Vendors" onClose={onClose}>
      {isLoading ? <Spinner /> : (
        <ul className="divide-y divide-line">
          {vendors?.map((v) => (
            <li key={v.id} className="py-2 text-sm">
              <p className="font-600">{v.name}</p>
              {v.contact && <p className="text-xs text-ink/50">{v.contact}</p>}
            </li>
          ))}
          {!vendors?.length && <p className="py-2 text-sm text-ink/40">No vendors yet — e.g. your upstream bandwidth provider.</p>}
        </ul>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <input className="input" placeholder="Vendor name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Contact (optional)" value={contact} onChange={(e) => setContact(e.target.value)} />
      </div>
      {err && <p className="mt-2 text-sm text-bad">{err}</p>}
      <button className="btn-primary mt-3 w-full" onClick={add} disabled={save.isPending}>Add vendor</button>
    </Modal>
  );
}

function AddBillModal({ onClose }: { onClose: () => void }) {
  const { data: vendors } = useVendors();
  const create = useCreateBill();
  const [vendorId, setVendorId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [billDate, setBillDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState(todayStr());
  const [reference, setReference] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    const amountCents = pesosToCentavos(amount);
    if (!vendorId) { setErr('Pick a vendor.'); return; }
    if (!description.trim() || amountCents <= 0) { setErr('Enter a description and an amount.'); return; }
    try {
      await create.mutateAsync({ vendorId, description: description.trim(), amountCents, billDate, dueDate, reference: reference.trim() || undefined });
      onClose();
    } catch (e) { setErr(apiError(e, 'Could not record the bill.')); }
  }

  return (
    <Modal title="Record a vendor bill" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">Vendor</label>
          <select className="input" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">— Pick a vendor —</option>
            {vendors?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          {!vendors?.length && <p className="mt-1 text-xs text-ink/40">No vendors yet — add one via the Vendors button first.</p>}
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. July upstream bandwidth" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Amount (₱)</label>
            <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <label className="label">Reference (optional)</label>
            <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="SOA / invoice no." />
          </div>
          <div>
            <label className="label">Bill date</label>
            <input className="input" type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Due date</label>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        {err && <p className="text-sm text-bad">{err}</p>}
        <div className="flex gap-2 pt-1">
          <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Saving…' : 'Record bill'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PayBillModal({ bill, onClose }: { bill: VendorBill; onClose: () => void }) {
  const pay = usePayBill();
  const [amount, setAmount] = useState(String(bill.outstandingCents / 100));
  const [method, setMethod] = useState('BANK');
  const [reference, setReference] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    const amountCents = pesosToCentavos(amount);
    if (amountCents <= 0) { setErr('Enter an amount.'); return; }
    try {
      await pay.mutateAsync({ id: bill.id, amountCents, method, reference: reference.trim() || undefined });
      onClose();
    } catch (e) { setErr(apiError(e, 'Could not record the payment.')); }
  }

  return (
    <Modal title={`Pay — ${bill.vendorName}`} onClose={onClose}>
      <p className="text-sm text-ink/60">{bill.description}</p>
      <p className="mt-1 text-sm">Outstanding: <span className="font-600">{peso(bill.outstandingCents)}</span></p>
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Amount (₱)</label>
            <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <label className="label">Method</label>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              {['BANK', 'GCASH', 'MAYA', 'CASH', 'OTHER'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Reference (optional)</label>
          <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        {err && <p className="text-sm text-bad">{err}</p>}
        <div className="flex gap-2 pt-1">
          <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={submit} disabled={pay.isPending}>
            {pay.isPending ? 'Saving…' : 'Record payment'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Periods ---------------------------------------------------------------

function PeriodsTab() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const { data: periods, isLoading } = usePeriods();
  const close = useClosePeriod();
  const reopen = useReopenPeriod();
  const [period, setPeriod] = useState(thisPeriod());
  const [err, setErr] = useState<string | null>(null);

  async function doClose() {
    setErr(null);
    if (!window.confirm(`Close ${period}? Income and expenses in that month become locked against edits, voids and backdating.`)) return;
    try { await close.mutateAsync(period); } catch (e) { setErr(apiError(e, 'Could not close the period.')); }
  }

  return (
    <div className="card p-5">
      <h2 className="font-display font-600">Financial period close</h2>
      <p className="mt-1 text-sm text-ink/50">Closing a month locks its money records. Reopening is owner-only.</p>
      <div className="mt-3 flex gap-2">
        <input className="input w-auto" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        <button className="btn-primary shrink-0" onClick={doClose} disabled={close.isPending}>Close month</button>
      </div>
      {err && <p className="mt-2 text-sm text-bad">{err}</p>}
      {isLoading ? <div className="mt-4"><Spinner /></div> : !periods?.length ? (
        <p className="mt-4 text-sm text-ink/40">No months closed yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {periods.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p className="font-600">{p.period}</p>
                {p.closedAt && <p className="text-xs text-ink/50">closed {new Date(p.closedAt).toLocaleDateString('en-PH')}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`pill text-[10px] ${p.status === 'CLOSED' ? 'bg-ink/10 text-ink/60' : 'bg-good/10 text-good'}`}>{p.status.toLowerCase()}</span>
                {p.status === 'CLOSED' && isOwner && (
                  <TwoTap label="reopen" onFire={async () => {
                    setErr(null);
                    try { await reopen.mutateAsync(p.period); } catch (e) { setErr(apiError(e, 'Could not reopen.')); }
                  }} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- Assets ----------------------------------------------------------------

function AssetsTab() {
  const { data, isLoading } = useAssets();
  const dispose = useDisposeAsset();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<FixedAssetRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Total cost" value={peso(data.totals.costCents)} />
          <Stat label="Depreciated" value={peso(data.totals.accumulatedCents)} />
          <Stat label="Book value" value={peso(data.totals.bookValueCents)} />
        </div>
      )}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-600">Fixed assets</h2>
          <button className="btn-primary" onClick={() => setAddOpen(true)}>+ Asset</button>
        </div>
        {err && <p className="mt-2 text-sm text-bad">{err}</p>}
        {isLoading ? <div className="mt-4"><Spinner /></div> : !data?.rows.length ? (
          <p className="mt-4 text-sm text-ink/40">Nothing registered yet — towers, radios, the service vehicle…</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {data.rows.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-600">{a.name}{a.category ? <span className="ml-1 text-xs font-400 text-ink/40">· {a.category}</span> : null}</p>
                  <p className="text-xs text-ink/50">
                    {new Date(a.acquiredAt).toLocaleDateString('en-PH')} · cost {peso(a.costCents)} · {a.usefulLifeMonths} mo life · {peso(a.monthlyCents)}/mo
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <p className="font-600">{peso(a.bookValueCents)}</p>
                    <p className="text-xs text-ink/40">book value</p>
                  </div>
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEditing(a)}>Edit</button>
                  <TwoTap label="dispose" onFire={async () => {
                    setErr(null);
                    try { await dispose.mutateAsync(a.id); } catch (e) { setErr(apiError(e, 'Could not dispose the asset.')); }
                  }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {(addOpen || editing) && <AssetModal asset={editing} onClose={() => { setAddOpen(false); setEditing(null); }} />}
    </div>
  );
}

function AssetModal({ asset, onClose }: { asset: FixedAssetRow | null; onClose: () => void }) {
  const save = useSaveAsset();
  const [name, setName] = useState(asset?.name ?? '');
  const [category, setCategory] = useState(asset?.category ?? '');
  const [acquiredAt, setAcquiredAt] = useState(asset ? asset.acquiredAt.slice(0, 10) : todayStr());
  const [cost, setCost] = useState(asset ? String(asset.costCents / 100) : '');
  const [salvage, setSalvage] = useState(asset && asset.salvageCents ? String(asset.salvageCents / 100) : '');
  const [life, setLife] = useState(asset ? String(asset.usefulLifeMonths) : '60');
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    const costCents = pesosToCentavos(cost);
    if (!name.trim() || costCents <= 0) { setErr('Enter a name and a cost.'); return; }
    try {
      await save.mutateAsync({
        id: asset?.id, name: name.trim(), category: category.trim() || undefined, acquiredAt,
        costCents, salvageCents: pesosToCentavos(salvage || '0'), usefulLifeMonths: Number(life) || 60,
      });
      onClose();
    } catch (e) { setErr(apiError(e, 'Could not save the asset.')); }
  }

  return (
    <Modal title={asset ? 'Edit asset' : 'Register an asset'} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tower 2 — Dacal" />
          </div>
          <div>
            <label className="label">Category (optional)</label>
            <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Network" />
          </div>
          <div>
            <label className="label">Acquired</label>
            <input className="input" type="date" value={acquiredAt} onChange={(e) => setAcquiredAt(e.target.value)} />
          </div>
          <div>
            <label className="label">Cost (₱)</label>
            <input className="input" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <label className="label">Salvage value (₱)</label>
            <input className="input" inputMode="decimal" value={salvage} onChange={(e) => setSalvage(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" />
          </div>
          <div className="col-span-2">
            <label className="label">Useful life (months)</label>
            <input className="input" inputMode="numeric" value={life} onChange={(e) => setLife(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
        </div>
        {err && <p className="text-sm text-bad">{err}</p>}
        <div className="flex gap-2 pt-1">
          <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Credit notes ----------------------------------------------------------

function CreditNotesTab() {
  const { data: notes, isLoading } = useCreditNotes();
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-600">Credit notes & refunds</h2>
          <p className="text-sm text-ink/50">A credit reduces what a customer owes; a refund returns cash from an overpayment.</p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => setOpen(true)}>+ New</button>
      </div>
      {isLoading ? <div className="mt-4"><Spinner /></div> : !notes?.length ? (
        <p className="mt-4 text-sm text-ink/40">None yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {notes.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-600">{peso(n.amountCents)} <span className="text-xs font-400 text-ink/50">· {n.reason}</span></p>
                <p className="text-xs text-ink/50">{new Date(n.createdAt).toLocaleDateString('en-PH')}{n.method ? ` · ${n.method}` : ''}</p>
              </div>
              <span className={`pill shrink-0 text-[10px] ${n.type === 'CREDIT' ? 'bg-good/10 text-good' : 'bg-signal/15 text-warn'}`}>{n.type.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      )}
      {open && <CreditNoteModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function CreditNoteModal({ onClose }: { onClose: () => void }) {
  const create = useCreateCreditNote();
  const [q, setQ] = useState('');
  const { data: results } = useSubscribers({ q: q || undefined, take: 8 });
  const [subscriber, setSubscriber] = useState<{ id: string; fullName: string; accountNo: string; balanceCents: number } | null>(null);
  const [type, setType] = useState<'CREDIT' | 'REFUND'>('CREDIT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    const amountCents = pesosToCentavos(amount);
    if (!subscriber) { setErr('Pick a subscriber.'); return; }
    if (amountCents <= 0 || !reason.trim()) { setErr('Enter an amount and a reason.'); return; }
    try {
      await create.mutateAsync({ subscriberId: subscriber.id, type, amountCents, reason: reason.trim(), method: method.trim() || undefined });
      onClose();
    } catch (e) { setErr(apiError(e, 'Could not save.')); }
  }

  return (
    <Modal title="New credit note / refund" onClose={onClose}>
      <div className="space-y-3">
        {!subscriber ? (
          <div>
            <label className="label">Subscriber</label>
            <input className="input" placeholder="Search name or account no." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            {q && (
              <ul className="mt-1 divide-y divide-line rounded-xl border border-line">
                {results?.items.slice(0, 8).map((s) => (
                  <li key={s.id}>
                    <button className="w-full px-3 py-2 text-left text-sm hover:bg-paper"
                      onClick={() => setSubscriber({ id: s.id, fullName: s.fullName, accountNo: s.accountNo, balanceCents: s.balanceCents })}>
                      <span className="font-600">{s.fullName}</span> <span className="text-xs text-ink/50">{s.accountNo}</span>
                    </button>
                  </li>
                ))}
                {results && !results.items.length && <li className="px-3 py-2 text-sm text-ink/40">No matches.</li>}
              </ul>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-line p-3 text-sm">
            <div>
              <p className="font-600">{subscriber.fullName}</p>
              <p className="text-xs text-ink/50">
                {subscriber.accountNo} · {subscriber.balanceCents > 0 ? `owes ${peso(subscriber.balanceCents)}` : subscriber.balanceCents < 0 ? `credit ${peso(-subscriber.balanceCents)}` : 'balanced'}
              </p>
            </div>
            <button className="text-xs font-600 text-signal-600" onClick={() => setSubscriber(null)}>change</button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {(['CREDIT', 'REFUND'] as const).map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={`rounded-xl border px-3 py-2 text-sm font-600 ${type === t ? 'border-signal-600 bg-signal/5 text-signal-600' : 'border-line text-ink/60'}`}>
              {t === 'CREDIT' ? 'Credit (reduce owed)' : 'Refund (return cash)'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Amount (₱)</label>
            <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <label className="label">Method (refunds)</label>
            <input className="input" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="e.g. GCash" />
          </div>
        </div>
        <div>
          <label className="label">Reason</label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. 5-day outage adjustment" />
        </div>
        {err && <p className="text-sm text-bad">{err}</p>}
        <div className="flex gap-2 pt-1">
          <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Bank reconciliation ---------------------------------------------------

function BankTab() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const { data, isLoading } = useUnreconciled({ from, to });
  const { data: accounts } = useBankAccounts();
  const reconcile = useReconcile();
  const save = useSaveBankAccount();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [accountId, setAccountId] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function doReconcile() {
    setMsg(null);
    try {
      const r = await reconcile.mutateAsync({ paymentIds: [...selected], bankAccountId: accountId || undefined });
      setSelected(new Set());
      setMsg(`Marked ${r.reconciled} payment${r.reconciled === 1 ? '' : 's'} reconciled ✓`);
    } catch (e) { setMsg(apiError(e, 'Could not reconcile.')); }
  }

  async function addAccount() {
    if (!newAccount.trim()) return;
    try { await save.mutateAsync({ name: newAccount.trim() }); setNewAccount(''); } catch { /* surfaced via list staying unchanged */ }
  }

  return (
    <div className="card p-5">
      <h2 className="font-display font-600">Bank reconciliation</h2>
      <p className="mt-1 text-sm text-ink/50">
        Tick the GCash/Maya/bank payments you can see on the statement, then mark them reconciled. Cash is covered by remittances instead.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <input className="input w-auto" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="pb-2 text-ink/40">–</span>
        <input className="input w-auto" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <select className="input w-auto" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">No account tag</option>
          {accounts?.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div className="flex items-end gap-1">
          <input className="input w-36" placeholder="+ account name" value={newAccount} onChange={(e) => setNewAccount(e.target.value)} />
          <button className="btn-ghost" onClick={addAccount} disabled={save.isPending}>Add</button>
        </div>
      </div>

      {msg && <p className="mt-3 text-sm text-ink/60">{msg}</p>}
      {isLoading ? <div className="mt-4"><Spinner /></div> : !data?.rows.length ? (
        <EmptyState title="Nothing to reconcile" hint="No unreconciled non-cash payments in this range." />
      ) : (
        <>
          <ul className="mt-3 divide-y divide-line">
            {data.rows.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 py-2.5 text-sm">
                  <input type="checkbox" className="h-4 w-4" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-600">{p.subscriber} <span className="text-xs font-400 text-ink/50">{p.accountNo}</span></p>
                    <p className="text-xs text-ink/50">
                      {new Date(p.createdAt).toLocaleDateString('en-PH')} · {p.method}{p.reference ? ` · ${p.reference}` : ''} · {p.receiptNo}
                    </p>
                  </div>
                  <span className="shrink-0 font-600">{peso(p.amountCents)}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
            <span className="text-ink/60">{selected.size} of {data.count} selected · unreconciled total {peso(data.totalCents)}</span>
            <button className="btn-primary" onClick={doReconcile} disabled={!selected.size || reconcile.isPending}>
              Mark reconciled
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---- Shared modal shell ----------------------------------------------------

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
