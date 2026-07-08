import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSubscribers, useCreateSubscriber, usePlans } from '../../hooks/queries';
import { peso } from '../../api/types';
import { Spinner, StatusPill, EmptyState } from '../../components/ui';
import { LocationSelect } from '../../components/LocationSelect';

const FILTERS: Array<{ key: string; label: string }> = [
  { key: '', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'PENDING_INSTALLATION', label: 'Pending' },
  { key: 'SUSPENDED', label: 'Suspended' },
];

export default function Subscribers() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const nav = useNavigate();
  const { data, isLoading } = useSubscribers({ q: q || undefined, status: status || undefined });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700">Subscribers</h1>
          <p className="text-sm text-ink/50">{data?.total ?? 0} total</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>Add subscriber</button>
      </div>

      <div className="space-y-3">
        <input className="input" placeholder="Search name, account no., PPPoE, phone…"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setStatus(f.key)}
              className={`pill whitespace-nowrap border ${
                status === f.key ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink/60'
              }`}>{f.label}</button>
          ))}
        </div>
      </div>

      {isLoading ? <Spinner /> : !data?.items.length ? (
        <EmptyState title="No subscribers found" hint="Try a different search, or add your first subscriber." />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {data.items.map((s) => (
            <button key={s.id} onClick={() => nav(`/owner/subscribers/${s.id}`)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-paper">
              <div className="min-w-0">
                <p className="truncate font-600">{s.fullName}</p>
                <p className="text-xs text-ink/50">
                  {s.accountNo}{s.servicePlan ? ` · ${s.servicePlan.name}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
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
  servicePlanId?: string;
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
