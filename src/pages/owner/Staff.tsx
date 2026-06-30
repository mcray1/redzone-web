import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useStaff, useCreateStaff, useSetStaffActive } from '../../hooks/queries';
import { Spinner, EmptyState } from '../../components/ui';

export default function Staff() {
  const { data: staff, isLoading } = useStaff();
  const setActive = useSetStaffActive();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700">Staff</h1>
          <p className="text-sm text-ink/50">Admins and collectors who can log in.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>Add staff</button>
      </div>

      {isLoading ? <Spinner /> : !staff?.length ? (
        <EmptyState title="No staff yet" hint="Add an admin or collector account." />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {staff.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-600">{u.name} {u.role === 'OWNER' && <span className="text-xs text-ink/40">(you)</span>}</p>
                <p className="text-xs text-ink/50">{u.email} · {u.role}</p>
              </div>
              {u.role !== 'OWNER' && (
                <button
                  onClick={() => setActive.mutate({ id: u.id, active: !u.active })}
                  className={`pill border ${u.active ? 'border-good/40 text-good' : 'border-ink/20 text-ink/40'}`}>
                  {u.active ? 'Active' : 'Disabled'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddStaffModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

interface StaffForm { name: string; email: string; password: string; role: 'ADMIN' | 'COLLECTOR'; }

function AddStaffModal({ onClose }: { onClose: () => void }) {
  const create = useCreateStaff();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<StaffForm>({
    defaultValues: { role: 'COLLECTOR' },
  });

  async function submit(v: StaffForm) {
    setError(null);
    try {
      await create.mutateAsync(v);
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Could not create the account.');
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Add staff</h2>
        <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-3">
          <div>
            <label className="label">Full name</label>
            <input className="input" {...register('name', { required: true })} />
            {errors.name && <p className="mt-1 text-xs text-bad">Required</p>}
          </div>
          <div>
            <label className="label">Email (used to log in)</label>
            <input className="input" type="email" {...register('email', { required: true })} />
            {errors.email && <p className="mt-1 text-xs text-bad">Required</p>}
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input className="input" type="text" {...register('password', { required: true, minLength: 8 })} />
            {errors.password && <p className="mt-1 text-xs text-bad">At least 8 characters</p>}
            <p className="mt-1 text-xs text-ink/40">Share this with them; they can change it later.</p>
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" {...register('role')}>
              <option value="COLLECTOR">Collector (mobile payments)</option>
              <option value="ADMIN">Administrator (full operations)</option>
            </select>
          </div>
          {error && <p className="text-sm text-bad">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
