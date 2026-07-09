import { useState } from 'react';
import { AxiosError } from 'axios';
import { usePasswordResets, useSetPasswordReset, useDismissPasswordReset, type ResetRequest } from '../../hooks/queries';
import { Spinner, EmptyState } from '../../components/ui';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ error?: string }>;
  return e?.response?.data?.error || fallback;
}

export default function PasswordResets() {
  const { data, isLoading } = usePasswordResets();
  const dismiss = useDismissPasswordReset();
  const [setting, setSetting] = useState<ResetRequest | null>(null);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-700">Password resets</h1>
        <p className="text-sm text-ink/50">Clients who asked to reset their password. Set a temporary one and tell them by phone/text.</p>
      </div>

      {isLoading ? <Spinner /> : !data || data.length === 0 ? (
        <EmptyState title="No reset requests" hint="Requests from the 'Forgot password' page show up here." />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {data.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-600">
                  {r.userName || r.email}
                  {r.isStaff && <span className="ml-2 pill bg-signal/15 text-signal-600 text-[10px]">staff</span>}
                </p>
                <p className="truncate text-xs text-ink/50">{r.email} · {new Date(r.createdAt).toLocaleString('en-PH')}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button className="text-sm font-600 text-ink/40" onClick={() => dismiss.mutate(r.id)}>Dismiss</button>
                <button className="btn-primary" onClick={() => setSetting(r)}>Set password</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {setting && <SetModal req={setting} onClose={() => setSetting(null)} />}
    </div>
  );
}

function SetModal({ req, onClose }: { req: ResetRequest; onClose: () => void }) {
  const set = useSetPasswordReset();
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setErr(null);
    if (password.length < 8) { setErr('Use at least 8 characters.'); return; }
    try {
      await set.mutateAsync({ id: req.id, password });
      onClose();
    } catch (e) {
      setErr(apiError(e, 'Could not set the password.'));
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">New password — {req.userName || req.email}</h2>
        <p className="mt-1 text-sm text-ink/50">Set a temporary password and share it with them. They can change it after signing in.</p>
        <div className="mt-4 space-y-3">
          <input className="input" type="text" placeholder="temporary password (min 8)" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          {err && <p className="text-sm text-bad">{err}</p>}
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" disabled={set.isPending} onClick={go}>
              {set.isPending ? 'Saving…' : 'Set password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
