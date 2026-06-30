import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { usePlans, useSavePlan, useDeletePlan } from '../../hooks/queries';
import { peso, type ServicePlan } from '../../api/types';
import { Spinner, EmptyState } from '../../components/ui';

export default function Plans() {
  const { data: plans, isLoading } = usePlans();
  const [editing, setEditing] = useState<ServicePlan | 'new' | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700">Service plans</h1>
          <p className="text-sm text-ink/50">The packages you offer subscribers.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing('new')}>Add plan</button>
      </div>

      {isLoading ? <Spinner /> : !plans?.length ? (
        <EmptyState title="No plans yet" hint="Add your first service plan." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className={`card p-5 ${!p.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <h3 className="font-display text-lg font-700">{p.name}</h3>
                {!p.active && <span className="pill bg-ink/10 text-ink/50">Inactive</span>}
              </div>
              <p className="mt-1 font-display text-2xl font-700 text-signal-600">
                {peso(p.priceCents)}<span className="text-sm font-500 text-ink/40">/mo</span>
              </p>
              <p className="mt-2 text-sm text-ink/60">
                {Math.round(p.downloadKbps / 1024)} Mbps down · {Math.round(p.uploadKbps / 1024)} Mbps up
              </p>
              <button className="btn-ghost mt-3 w-full text-sm" onClick={() => setEditing(p)}>
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <PlanModal
          plan={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

interface PlanForm { name: string; pricePeso: number; downMbps: number; upMbps: number; }

function PlanModal({ plan, onClose }: { plan: ServicePlan | null; onClose: () => void }) {
  const save = useSavePlan();
  const del = useDeletePlan();
  const { register, handleSubmit, formState: { errors } } = useForm<PlanForm>({
    defaultValues: plan
      ? {
          name: plan.name,
          pricePeso: plan.priceCents / 100,
          downMbps: Math.round(plan.downloadKbps / 1024),
          upMbps: Math.round(plan.uploadKbps / 1024),
        }
      : { name: '', pricePeso: undefined, downMbps: undefined, upMbps: undefined },
  });

  async function submit(v: PlanForm) {
    await save.mutateAsync({
      id: plan?.id,
      name: v.name,
      priceCents: Math.round(Number(v.pricePeso) * 100),
      downloadKbps: Math.round(Number(v.downMbps) * 1024),
      uploadKbps: Math.round(Number(v.upMbps) * 1024),
    });
    onClose();
  }

  async function remove() {
    if (!plan) return;
    if (!confirm(`Remove "${plan.name}"? If subscribers use it, it will be deactivated instead.`)) return;
    await del.mutateAsync(plan.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">{plan ? 'Edit plan' : 'Add plan'}</h2>
        <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-3">
          <div>
            <label className="label">Plan name</label>
            <input className="input" placeholder="e.g. Standard" {...register('name', { required: true })} />
            {errors.name && <p className="mt-1 text-xs text-bad">Required</p>}
          </div>
          <div>
            <label className="label">Price (₱ per month)</label>
            <input className="input" type="number" step="0.01" min="0"
              {...register('pricePeso', { required: true })} />
            {errors.pricePeso && <p className="mt-1 text-xs text-bad">Required</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Download (Mbps)</label>
              <input className="input" type="number" min="0" {...register('downMbps', { required: true })} />
            </div>
            <div>
              <label className="label">Upload (Mbps)</label>
              <input className="input" type="number" min="0" {...register('upMbps', { required: true })} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            {plan && (
              <button type="button" className="btn-ghost text-bad" onClick={remove} disabled={del.isPending}>
                Remove
              </button>
            )}
            <div className="flex flex-1 gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
              <button className="btn-primary flex-1" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
