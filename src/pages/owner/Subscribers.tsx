import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSubscribers, useCreateSubscriber, usePlans, useVendoSites } from '../../hooks/queries';
import { useAuth } from '../../context/AuthContext';
import { peso } from '../../api/types';
import { Spinner, StatusPill, EmptyState } from '../../components/ui';
import { LocationSelect } from '../../components/LocationSelect';

const FILTERS: Array<{ key: string; label: string }> = [
  { key: '', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'PENDING_INSTALLATION', label: 'Pending' },
  { key: 'SUSPENDED', label: 'Suspended' },
];

// "Not connected recently" thresholds. Default (first real option) is 24 hours.
const OFFLINE: Array<{ key: string; label: string }> = [
  { key: '', label: 'Any activity' },
  { key: '24', label: 'Offline ≥ 24 hours' },
  { key: '72', label: 'Offline ≥ 3 days' },
  { key: '168', label: 'Offline ≥ 7 days' },
  { key: '720', label: 'Offline ≥ 30 days' },
];

// Turn a last-seen-online timestamp into a small, friendly label.
function lastOnlineLabel(iso?: string | null): { text: string; tone: string } {
  if (!iso) return { text: 'No online data yet', tone: 'text-ink/30' };
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (hours < 1) return { text: 'Online', tone: 'text-good' };
  if (hours < 24) return { text: `Offline ${Math.floor(hours)}h`, tone: 'text-ink/50' };
  return { text: `Offline ${Math.floor(hours / 24)}d`, tone: 'text-bad' };
}

export default function Subscribers() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState<'PLAN' | 'VENDO'>('PLAN');
  const [offlineHours, setOfflineHours] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const nav = useNavigate();
  const { hasPerm } = useAuth();
  // Paying accounts come from /subscribers; vendo sites are their own table
  // since the split and come from /vendo/sites.
  const isVendoTab = type === 'VENDO';
  const { data, isLoading } = useSubscribers({
    q: q || undefined,
    status: status || undefined,
    offlineHours: offlineHours ? Number(offlineHours) : undefined,
  });
  const { data: allSites, isLoading: sitesLoading } = useVendoSites(true);
  const sites = (allSites ?? []).filter((s) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return [s.vendoName, s.partnerName, s.accountNo, s.vendoNumber, s.phone]
      .some((v) => v && v.toLowerCase().includes(needle));
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700">{isVendoTab ? 'Vendo sites' : 'Subscribers'}</h1>
          <p className="text-sm text-ink/50">{isVendoTab ? `${sites.length} vendo` : `${data?.total ?? 0} paying`}</p>
        </div>
        {!isVendoTab && hasPerm('subscribers.add') && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}>Add subscriber</button>
        )}
        {isVendoTab && (
          <button className="btn-primary" onClick={() => nav('/owner/vendo')}>Vendo page</button>
        )}
      </div>

      <div className="flex gap-2">
        {(['PLAN', 'VENDO'] as const).map((t) => (
          <button key={t} onClick={() => setType(t)}
            className={`flex-1 rounded-xl border px-4 py-2 text-sm font-600 ${type === t ? 'border-signal-600 bg-signal/5 text-signal-600' : 'border-line text-ink/60'}`}>
            {t === 'PLAN' ? 'Paying accounts' : 'Vendo sites'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <input className="input" placeholder="Search name, account no., PPPoE, phone…"
          value={q} onChange={(e) => setQ(e.target.value)} />
        {!isVendoTab && (
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setStatus(f.key)}
              className={`pill whitespace-nowrap border ${
                status === f.key ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink/60'
              }`}>{f.label}</button>
          ))}
        </div>
        )}
        {!isVendoTab && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-600 uppercase tracking-wide text-ink/40">Connection</label>
              <select className="input w-auto" value={offlineHours} onChange={(e) => setOfflineHours(e.target.value)}>
                {OFFLINE.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>
            {offlineHours && (
              <p className="text-xs text-ink/40">
                Based on live router reports. Until the MikroTik integration is running, no one is reported online,
                so accounts with no data yet are counted as offline.
              </p>
            )}
          </div>
        )}
      </div>

      {isVendoTab ? (
        sitesLoading ? <Spinner /> : !sites.length ? (
          <EmptyState title="No vendo sites found" hint="Add machines from the Vendo page, or approve a WiFi Vendo registration." />
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {sites.map((s) => (
              <button key={s.id} onClick={() => nav(`/owner/vendo/${s.id}`)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-paper">
                <div className="min-w-0">
                  <p className="truncate font-600">
                    {s.vendoNumber && <span className="mr-1 text-signal-600">#{s.vendoNumber}</span>}
                    {s.vendoName}
                  </p>
                  <p className="text-xs text-ink/50">{s.accountNo} · {s.partnerName}</p>
                </div>
                <span className={`pill shrink-0 ${s.status === 'ACTIVE' ? 'bg-good/10 text-good' : 'bg-ink/10 text-ink/50'}`}>
                  {s.status === 'ACTIVE' ? 'Active' : 'Archived'}
                </span>
              </button>
            ))}
          </div>
        )
      ) : isLoading ? <Spinner /> : !data?.items.length ? (
        <EmptyState title="No subscribers found" hint="Try a different search, or add your first subscriber." />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {data.items.map((s) => (
            <button key={s.id} onClick={() => nav(`/owner/subscribers/${s.id}`)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-paper">
              <div className="min-w-0">
                <p className="truncate font-600">{s.fullName}</p>
                <p className="text-xs text-ink/50">
                  {s.accountNo}
                  {s.servicePlan ? ` · ${s.servicePlan.name}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {(() => {
                  const o = lastOnlineLabel(s.lastOnlineAt);
                  return <span className={`hidden text-xs sm:inline ${o.tone}`}>{o.text}</span>;
                })()}
                {s.balanceCents > 0 && (
                  <span className="text-sm font-600 text-bad">{peso(s.balanceCents)}</span>
                )}
                <StatusPill status={s.status} />
              </div>
            </button>
          ))}
        </div>
      )}

      {showAdd && <AddSubscriberModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

interface AddVals {
  accountNo: string; fullName: string; email?: string; phone?: string;
  address?: string; sitio?: string; barangay?: string; municipality?: string; dueDay?: number;
  servicePlanId?: string; pppoeUsername?: string;
}

function AddSubscriberModal({ onClose }: { onClose: () => void }) {
  const create = useCreateSubscriber();
  const { data: plans } = usePlans();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<AddVals>();

  const municipality = watch('municipality') || '';
  const barangay = watch('barangay') || '';

  async function submit(vals: AddVals) {
    await create.mutateAsync({
      ...vals,
      dueDay: vals.dueDay ? Number(vals.dueDay) : 1,
      servicePlanId: vals.servicePlanId || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-0 md:items-center md:p-4"
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Add subscriber</h2>
        <form onSubmit={handleSubmit(submit)} className="mt-4 grid grid-cols-2 gap-3">
          <div className="col-span-1">
            <label className="label">Account no.</label>
            <input className="input" {...register('accountNo', { required: true })} />
            {errors.accountNo && <p className="mt-1 text-xs text-bad">Required</p>}
          </div>
          <div className="col-span-1">
            <label className="label">Due day</label>
            <input className="input" type="number" min={1} max={28} defaultValue={1} {...register('dueDay')} />
          </div>
          <div className="col-span-2">
            <label className="label">Full name</label>
            <input className="input" {...register('fullName', { required: true })} />
            {errors.fullName && <p className="mt-1 text-xs text-bad">Required</p>}
          </div>
          <div className="col-span-1">
            <label className="label">Phone</label>
            <input className="input" {...register('phone')} />
          </div>
          <div className="col-span-1">
            <label className="label">Email</label>
            <input className="input" type="email" {...register('email')} />
          </div>
          <div className="col-span-1">
            <label className="label">Address</label>
            <input className="input" {...register('address')} />
          </div>
          <div className="col-span-1">
            <label className="label">Sitio / Purok</label>
            <input className="input" {...register('sitio')} />
          </div>
          <div className="col-span-2">
            <input type="hidden" {...register('municipality')} />
            <input type="hidden" {...register('barangay')} />
            <LocationSelect
              municipality={municipality}
              barangay={barangay}
              onMunicipality={(v) => setValue('municipality', v)}
              onBarangay={(v) => setValue('barangay', v)}
            />
          </div>
          <div className="col-span-2">
            <label className="label">PPPoE username (optional)</label>
            <input className="input" {...register('pppoeUsername')} placeholder="links to the router account" />
          </div>
          <div className="col-span-2">
            <label className="label">Service plan</label>
            <select className="input" {...register('servicePlanId')}>
              <option value="">— No plan yet —</option>
              {plans?.filter((p) => p.active).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({peso(p.priceCents)}/mo)
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 mt-2 flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Save subscriber'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
