import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTenants, useCreateTenant, useUpdateTenant, useRotateAgentToken } from '../../hooks/queries';
import { useAuth } from '../../context/AuthContext';
import { Spinner, EmptyState } from '../../components/ui';
import type { TenantSummary } from '../../api/types';

// Platform super-admin only: manage the workspaces (tenants) on this deployment.
export default function Tenants() {
  const { user } = useAuth();
  const isSuper = Boolean(user?.isSuperAdmin);
  const { data, isLoading } = useTenants(isSuper);
  const [showAdd, setShowAdd] = useState(false);
  const [oneTimeToken, setOneTimeToken] = useState<{ tenant: string; token: string } | null>(null);

  if (!isSuper) {
    return <EmptyState title="Super-admin only" hint="This page manages all workspaces on the platform." />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700">Workspaces</h1>
          <p className="text-sm text-ink/50">{data?.length ?? 0} tenants on this platform</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>New workspace</button>
      </div>

      {oneTimeToken && (
        <div className="card border-signal/40 p-4">
          <p className="font-600">Agent token for “{oneTimeToken.tenant}” — shown once</p>
          <p className="mt-1 break-all font-mono text-sm text-signal-600">{oneTimeToken.token}</p>
          <div className="mt-2 flex gap-2">
            <button className="btn-primary" onClick={() => navigator.clipboard.writeText(oneTimeToken.token)}>Copy</button>
            <button className="pill border border-line" onClick={() => setOneTimeToken(null)}>Dismiss</button>
          </div>
          <p className="mt-2 text-xs text-ink/50">Paste it into that tenant's router loader script. Only a hash is stored — it cannot be shown again.</p>
        </div>
      )}

      {isLoading ? <Spinner /> : !data?.length ? (
        <EmptyState title="No workspaces" hint="Create the first tenant to get started." />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {data.map((t) => (
            <TenantRow key={t.id} t={t} onToken={(token) => setOneTimeToken({ tenant: t.name, token })} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddTenantModal
          onClose={() => setShowAdd(false)}
          onCreated={(name, token) => { setShowAdd(false); setOneTimeToken({ tenant: name, token }); }}
        />
      )}
    </div>
  );
}

function TenantRow({ t, onToken }: { t: TenantSummary; onToken: (token: string) => void }) {
  const update = useUpdateTenant();
  const rotate = useRotateAgentToken();
  const suspended = t.status === 'SUSPENDED';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="font-600">
          {t.name}
          {suspended && <span className="ml-2 rounded-full bg-bad/10 px-2 py-0.5 text-xs font-600 text-bad">Suspended</span>}
        </p>
        <p className="text-xs text-ink/50">
          {t.subscribers} subscribers · {t.members} members · {t.hasAgentToken ? 'agent token set' : 'no agent token'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          className="pill border border-line text-xs"
          disabled={rotate.isPending}
          onClick={() => {
            if (window.confirm(`Rotate the agent token for "${t.name}"?\n\nTheir routers stop reporting until the new token is pasted into each router's loader script.`)) {
              rotate.mutate(t.id, { onSuccess: (d) => onToken(d.agentToken) });
            }
          }}>
          {rotate.isPending ? 'Rotating…' : 'Rotate token'}
        </button>
        <button
          className={`pill border text-xs ${suspended ? 'border-line' : 'border-bad/40 text-bad'}`}
          disabled={update.isPending}
          onClick={() => {
            const next = suspended ? 'ACTIVE' : 'SUSPENDED';
            if (window.confirm(suspended
              ? `Reactivate "${t.name}"? Their logins and routers start working again.`
              : `Suspend "${t.name}"?\n\nAll their logins are blocked and their routers stop being served. Data is kept.`)) {
              update.mutate({ id: t.id, status: next });
            }
          }}>
          {suspended ? 'Reactivate' : 'Suspend'}
        </button>
      </div>
    </div>
  );
}

interface AddVals { tenantName: string; ownerName: string; email: string; password: string; }

function AddTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string, token: string) => void }) {
  const create = useCreateTenant();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AddVals>();
  const [error, setError] = useState<string | null>(null);

  async function submit(vals: AddVals) {
    setError(null);
    try {
      const r = await create.mutateAsync(vals);
      onCreated(r.tenant.name, r.agentToken);
    } catch (err) {
      const m = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(m || 'Could not create the workspace.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">New workspace</h2>
        <p className="text-sm text-ink/50">Creates the tenant, its first owner login, and starter settings.</p>
        <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-3">
          <div>
            <label className="label">Business name</label>
            <input className="input" {...register('tenantName', { required: true, minLength: 2 })} />
            {errors.tenantName && <p className="mt-1 text-xs text-bad">Required (2+ characters).</p>}
          </div>
          <div>
            <label className="label">Owner name</label>
            <input className="input" {...register('ownerName', { required: true })} />
          </div>
          <div>
            <label className="label">Owner email</label>
            <input className="input" type="email" {...register('email', { required: true })} />
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input className="input" type="text" placeholder="They change it after first login" {...register('password', { required: true, minLength: 8 })} />
            {errors.password && <p className="mt-1 text-xs text-bad">At least 8 characters.</p>}
          </div>
          {error && <p className="text-sm text-bad">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" className="pill flex-1 border border-line" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
