import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useChangePassword } from '../hooks/queries';

interface Vals { currentPassword: string; newPassword: string; confirm: string; }

/** Modal for the logged-in user to change their own password. */
export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const change = useChangePassword();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Vals>();

  async function submit(v: Vals) {
    setError(null);
    if (v.newPassword !== v.confirm) {
      setError('The new passwords do not match.');
      return;
    }
    try {
      await change.mutateAsync({ currentPassword: v.currentPassword, newPassword: v.newPassword });
      setDone(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Could not change the password.');
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-good/10 text-good">✓</div>
            <h2 className="mt-3 font-display text-lg font-700">Password changed</h2>
            <p className="mt-2 text-sm text-ink/60">
              Your password is updated. For safety, other devices have been signed out and will need to sign in again.
            </p>
            <button className="btn-dark mt-5 w-full" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <h2 className="font-display text-lg font-700">Change password</h2>
            <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-3">
              <div>
                <label className="label">Current password</label>
                <input className="input" type="password" autoComplete="current-password"
                  {...register('currentPassword', { required: true })} />
                {errors.currentPassword && <p className="mt-1 text-xs text-bad">Required</p>}
              </div>
              <div>
                <label className="label">New password</label>
                <input className="input" type="password" autoComplete="new-password"
                  {...register('newPassword', { required: true, minLength: 8 })} />
                {errors.newPassword && <p className="mt-1 text-xs text-bad">At least 8 characters</p>}
              </div>
              <div>
                <label className="label">Confirm new password</label>
                <input className="input" type="password" autoComplete="new-password"
                  {...register('confirm', { required: true, validate: (v) => v === watch('newPassword') || 'Passwords do not match' })} />
                {errors.confirm && <p className="mt-1 text-xs text-bad">{errors.confirm.message || 'Required'}</p>}
              </div>
              {error && <p className="text-sm text-bad">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
                <button className="btn-primary flex-1" disabled={change.isPending}>
                  {change.isPending ? 'Saving…' : 'Change password'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
