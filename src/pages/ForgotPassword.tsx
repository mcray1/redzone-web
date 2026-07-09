import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useRequestPasswordReset } from '../hooks/queries';
import { Logo } from '../components/ui';

export default function ForgotPassword() {
  const request = useRequestPasswordReset();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    try { await request.mutateAsync(email.trim()); } catch { /* respond the same regardless */ }
    setDone(true);
  }

  return (
    <div className="min-h-full bg-ink text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <Logo light />
        {done ? (
          <>
            <h1 className="mt-8 font-display text-2xl font-700">Check your options</h1>
            <p className="mt-2 text-white/60">
              If <span className="font-600">{email}</span> is registered, we've emailed a reset link (if email is set up)
              and notified our team. If you don't get an email, our staff will help you reset it — contact RedZone.
            </p>
            <Link to="/login" className="btn-primary mt-6">Back to sign in</Link>
          </>
        ) : (
          <>
            <h1 className="mt-8 font-display text-2xl font-700">Forgot password</h1>
            <p className="mt-2 text-white/60">Enter the email you signed up with and we'll help you reset it.</p>
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div>
                <label className="label text-white/50">Email</label>
                <input className="input bg-ink-700 border-ink-600 text-white placeholder:text-white/30"
                  type="email" inputMode="email" autoComplete="email" placeholder="you@email.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button className="btn-primary w-full" disabled={request.isPending}>
                {request.isPending ? 'Sending…' : 'Reset my password'}
              </button>
            </form>
            <p className="mt-6 text-center text-xs text-white/40">
              Remembered it? <Link to="/login" className="font-600 text-signal-300">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
