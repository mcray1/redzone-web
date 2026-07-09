import { useState } from 'react';
import { AxiosError } from 'axios';
import {
  useCustomRoles, usePermissionCatalog, useSaveCustomRole, useDeleteCustomRole,
} from '../../hooks/queries';
import type { CustomRole, PermissionKey } from '../../api/types';
import { Spinner, EmptyState } from '../../components/ui';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ error?: string }>;
  return e?.response?.data?.error || fallback;
}

export default function Roles() {
  const { data: roles, isLoading } = useCustomRoles();
  const [editing, setEditing] = useState<CustomRole | 'new' | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700">Roles &amp; permissions</h1>
          <p className="text-sm text-ink/50">
            Build a role — like Branch Manager — and tick exactly what it can do. Owners and admins always have full access.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setEditing('new')}>New role</button>
      </div>

      {isLoading ? <Spinner /> : !roles?.length ? (
        <EmptyState title="No custom roles yet" hint="Create a role to give a trusted staff member a limited set of admin powers." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => (
            <button key={r.id} className="card p-5 text-left transition hover:border-ink/30" onClick={() => setEditing(r)}>
              <div className="flex items-start justify-between">
                <h3 className="font-display text-lg font-700">{r.name}</h3>
                <span className="pill bg-ink/10 text-ink/60">{r.userCount ?? 0} staff</span>
              </div>
              <p className="mt-2 text-sm text-ink/60">
                {r.permissions.length} {r.permissions.length === 1 ? 'capability' : 'capabilities'}
              </p>
            </button>
          ))}
        </div>
      )}

      {editing && (
        <RoleModal role={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function RoleModal({ role, onClose }: { role: CustomRole | null; onClose: () => void }) {
  const { data: catalog } = usePermissionCatalog();
  const save = useSaveCustomRole();
  const del = useDeleteCustomRole();
  const [name, setName] = useState(role?.name ?? '');
  const [perms, setPerms] = useState<PermissionKey[]>(role?.permissions ?? []);
  const [error, setError] = useState<string | null>(null);

  function toggle(key: PermissionKey) {
    setPerms((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  async function submit() {
    setError(null);
    if (!name.trim()) { setError('Give the role a name.'); return; }
    try {
      await save.mutateAsync({ id: role?.id, name: name.trim(), permissions: perms });
      onClose();
    } catch (err) {
      setError(apiError(err, 'Could not save the role.'));
    }
  }

  async function remove() {
    if (!role) return;
    if (!confirm(`Delete the "${role.name}" role? Staff who hold it must be reassigned first.`)) return;
    setError(null);
    try {
      await del.mutateAsync(role.id);
      onClose();
    } catch (err) {
      setError(apiError(err, 'Could not delete the role.'));
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">{role ? 'Edit role' : 'New role'}</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="label">Role name</label>
            <input className="input" placeholder="e.g. Branch Manager" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="label">What this role can do</label>
            <div className="mt-1 space-y-1.5">
              {catalog?.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm hover:bg-line/30">
                  <input type="checkbox" className="h-4 w-4 accent-signal-600"
                    checked={perms.includes(c.key)} onChange={() => toggle(c.key)} />
                  <span className="text-ink/80">{c.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink/40">
              Anything left unticked stays owner/admin only. Voiding payments and approving expenses are powerful — grant them carefully.
            </p>
          </div>

          {error && <p className="text-sm text-bad">{error}</p>}

          <div className="flex gap-2 pt-1">
            {role && (
              <button type="button" className="btn-ghost text-bad" onClick={remove} disabled={del.isPending}>
                Delete
              </button>
            )}
            <div className="flex flex-1 gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
              <button type="button" className="btn-primary flex-1" onClick={submit} disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save role'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
