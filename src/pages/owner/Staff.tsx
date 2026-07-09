import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useStaff, useCreateStaff, useSetStaffActive, useSetStaffRoles } from '../../hooks/queries';
import type { StaffUser } from '../../api/types';
import { Spinner, EmptyState } from '../../components/ui';
import { StaffScopeEditor } from './StaffScopeEditor';

export default function Staff() {
  const { data: staff, isLoading } = useStaff();
  const setActive = useSetStaffActive();
  const [showAdd, setShowAdd] = useState(false);
  const [scopeUserId, setScopeUserId] = useState<string | null>(null);
  const [rolesUser, setRolesUser] = useState<StaffUser | null>(null);

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
            <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-600">{u.name} {u.role === 'OWNER' && <span className="text-xs text-ink/40">(you)</span>}</p>
                <p className="text-xs text-ink/50">
                  {u.email} · {(u.roles && u.roles.length ? u.roles : [u.role]).join(' + ')}
                  {u.role !== 'OWNER' && u.municipalities && u.municipalities.length > 0 && (
                    <> · {u.municipalities.join(', ')}</>
                  )}
                </p>
              </div>
              {u.role !== 'OWNER' && (
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => setRolesUser(u)} className="text-sm font-600 text-signal-600">
                    Roles
                  </button>
                  <button onClick={() => setScopeUserId(u.id)} className="text-sm font-600 text-signal-600">
                    Coverage
                  </button>
                  <button
                    onClick={() => setActive.mutate({ id: u.id, active: !u.active })}
                    className={`pill border ${u.active ? 'border-good/40 text-good' : 'border-ink/20 text-ink/40'}`}>
                    {u.active ? 'Active' : 'Disabled'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddStaffModal onClose={() => setShowAdd(false)} />}
      {scopeUserId && <StaffScopeEditor userId={scopeUserId} onClose={() => setScopeUserId(null)} />}
      {rolesUser && <RolesModal user={rolesUser} onClose={() => setRolesUser(null)} />}
    </div>
  );
}

const ROLE_OPTIONS = ['ADMIN', 'COLLECTOR', 'TECHNICIAN'] as const;

function RolesModal({ user, onClose }: { user: StaffUser; onClose: () => void }) {
  const setRoles = useSetStaffRoles();
  const [roles, setRolesState] = useState<string[]>(user.roles && user.roles.length ? user.roles : [user.role]);
  const [err, setErr] = useState<string | null>(null);

  function toggle(r: string) {
    setRolesState((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }

  async function save() {
    setErr(null);
    if (roles.length === 0) { setErr('Pick at least one role.'); return; }
    try {
      await setRoles.mutateAsync({ id: user.id, roles });
      onClose();
    } catch {
      setErr('Could not update roles.');
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Roles — {user.name}</h2>
        <p className="mt-1 text-sm text-ink/50">One person can hold more than one role (e.g. collector and technician).</p>
        <div className="mt-4 space-y-2">
          {ROLE_OPTIONS.map((r) => (
            <label key={r} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={roles.includes(r)} onChange={() => toggle(r)} />
              {r === 'ADMIN' ? 'Admin' : r === 'COLLECTOR' ? 'Collector' : 'Technician'}
            </label>
          ))}
          {err && <p className="text-sm text-bad">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" disabled={setRoles.isPending} onClick={save}>
              {setRoles.isPending ? 'Saving…' : 'Save roles'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StaffForm { name: string; email: string; password: string; role: 'ADMIN' | 'COLLECTOR' | 'TECHNICIAN'; }

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
              <option value="TECHNICIAN">Technician (installs & repairs)</option>
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
