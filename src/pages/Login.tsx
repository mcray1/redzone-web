import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/ui';

interface FormVals { email: string; password: string; }

function landingFor(role: string) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER' ? '/owner'
    : role === 'COLLECTOR' ? '/collector'
    : role === 'TECHNICIAN' ? '/technician' : '/portal';
}

export default function Login() {
  const { login, verifyMfa } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormVals>();
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  async function onSubmit(vals: FormVals) {
    setError(null);
    try {
      const res = await login(vals.email, vals.password);
      if (res.mfaRequired) { setMfaToken(res.mfaToken); return; }
      nav(landingFor(res.user.role), { replace: true });
    } catch {
      setError('Wrong email or password. Try again.');
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (!mfaToken) return;
    setError(null); setVerifying(true);
    try {
      const user = await verifyMfa(mfaToken, code.trim());
      nav(landingFor(user.role), { replace: true });
    } catch (err) {
      const m = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(m || 'That code is wrong or expired.');
    } finally { setVerifying(false); }
  }

  return (
    <div className="min-h-full bg-ink text-white">
      {/* night-sky gradient with faint signal arcs */}
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full border border-signal/40" />
          <div className="absolute -top-40 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full border border-signal/20" />
        </div>

        <div className="relative">
          <Logo light />
          <h1 className="mt-8 font-display text-3xl font-700 leading-tight">
            Welcome back.
          </h1>
          {mfaToken ? (
            <>
              <p className="mt-2 text-white/60">Enter the 6-digit code from your authenticator app.</p>
              <form onSubmit={onVerify} className="mt-8 space-y-4">
                <div>
                  <label className="label text-white/50">Authentication code</label>
                  <input
                    className="input bg-ink-700 border-ink-600 text-center text-2xl tracking-[0.4em] text-white placeholder:text-white/20"
                    inputMode="numeric" autoFocus maxLength={6} placeholder="123456"
                    value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                </div>
                {error && <p className="text-sm text-signal-300">{error}</p>}
                <button className="btn-primary w-full" disabled={verifying || code.length < 6}>
                  {verifying ? 'Verifying…' : 'Verify'}
                </button>
                <button type="button" className="block w-full text-center text-xs text-white/50"
                  onClick={() => { setMfaToken(null); setCode(''); setError(null); }}>
                  ← Back to sign in
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="mt-2 text-white/60">Sign in to manage your connection.</p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
                <div>
                  <label className="label text-white/50">Email</label>
                  <input
                    className="input bg-ink-700 border-ink-600 text-white placeholder:text-white/30"
                    type="email" autoComplete="email" placeholder="you@redzone.com.ph"
                    {...register('email', { required: true })}
                  />
                </div>
                <div>
                  <label className="label text-white/50">Password</label>
                  <input
                    className="input bg-ink-700 border-ink-600 text-white placeholder:text-white/30"
                    type="password" autoComplete="current-password" placeholder="••••••••"
                    {...register('password', { required: true })}
                  />
                </div>
                {error && <p className="text-sm text-signal-300">{error}</p>}
                <button className="btn-primary w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in…' : 'Sign in'}
                </button>
                <div className="text-right">
                  <Link to="/forgot" className="text-xs font-600 text-white/50">Forgot password?</Link>
                </div>
              </form>

              {/* Prospective clients — public sign-up form */}
              <div className="mt-6 rounded-xl border border-white/10 bg-ink-700/60 p-4 text-center">
                <p className="text-sm text-white/70">Not a customer yet?</p>
                <Link to="/register" className="mt-2 inline-block font-600 text-signal-300">
                  Sign up for internet or a WiFi Vendo →
                </Link>
              </div>
            </>
          )}

          <p className="mt-6 text-center text-xs text-white/40">
            Trouble signing in? Contact RedZone support.
          </p>
        </div>
      </div>
    </div>
  );
}
