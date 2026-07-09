import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/ui';

interface FormVals { email: string; password: string; }

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormVals>();

  async function onSubmit(vals: FormVals) {
    setError(null);
    try {
      const user = await login(vals.email, vals.password);
      const dest = user.role === 'OWNER' || user.role === 'ADMIN'
        ? '/owner'
        : user.role === 'COLLECTOR' ? '/collector'
        : user.role === 'TECHNICIAN' ? '/technician' : '/portal';
      nav(dest, { replace: true });
    } catch {
      setError('Wrong email or password. Try again.');
    }
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
          </form>

          {/* Prospective clients — public sign-up form */}
          <div className="mt-6 rounded-xl border border-white/10 bg-ink-700/60 p-4 text-center">
            <p className="text-sm text-white/70">Not a customer yet?</p>
            <Link to="/register" className="mt-2 inline-block font-600 text-signal-300">
              Sign up for internet or a WiFi Vendo →
            </Link>
          </div>

          <p className="mt-6 text-center text-xs text-white/40">
            Trouble signing in? Contact RedZone support.
          </p>
        </div>
      </div>
    </div>
  );
}
