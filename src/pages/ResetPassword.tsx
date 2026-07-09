import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useResetPassword } from '../hooks/queries';
import { Logo } from '../components/ui';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ error?: string }>;
  return e?.response?.data?.error || fallback;
}

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const reset = useResetPassword();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError('The two passwords do not match.'); return; }
    try {
      await reset.mutateAsync({ token, password });
      setDone(true);
    } catch (err) {
      setError(apiError(err, 'Could not reset your password.'));
    }
  }

  return (
    <div className="min-h-full bg-ink text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <Logo light />
        {!token ? (
          <>
            <h1 className="mt-8 font-display text-2xl font-700">Invalid link</h1>
            <p className="mt-2 text-white/60">This reset link is missing its code. Please request a new one.</p>
            <Link to="/forgot" className="btn-primary mt-6">Request a new link</Link>
          </>
        ) : done ? (
          <>
            <h1 className="mt-8 font-display text-2xl font-700">Password updated</h1>
            <p className="mt-2 text-white/60">You can now sign in with your new password.</p>
            <Link to="/login" className="btn-primary mt-6">Sign in</Link>
          </>
        ) : (
          <>
            <h1 className="mt-8 font-display text-2xl font-700">Set a new password</h1>
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div>
                <label className="label text-white/50">New password</label>
                <input className="input bg-ink-700 border-ink-600 text-white placeholder:text-white/30"
                  type="password" autoComplete="new-password" placeholder="at least 8 characters"
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <label className="label text-white/50">Confirm password</label>
                <input className="input bg-ink-700 border-ink-600 text-white placeholder:text-white/30"
                  type="password" autoComplete="new-password" placeholder="type it again"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              {error && <p className="text-sm text-signal-300">{error}</p>}
              <button className="btn-primary w-full" disabled={reset.isPending}>
                {reset.isPending ? 'Saving…' : 'Save new password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
