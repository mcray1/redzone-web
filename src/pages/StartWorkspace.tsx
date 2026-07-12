import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTenantSignup } from '../hooks/queries';
import { Logo } from '../components/ui';

interface Vals { tenantName: string; ownerName: string; email: string; password: string; }

// Public onboarding: creates a new workspace (tenant) with its first owner
// account, seeded settings/plans, and a one-time router agent token.
export default function StartWorkspace() {
  const signup = useTenantSignup();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Vals>();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; agentToken: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(vals: Vals) {
    setError(null);
    try {
      const r = await signup.mutateAsync(vals);
      setDone({ name: r.tenant.name, agentToken: r.agentToken });
    } catch (err) {
      const m = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(m || 'Could not create the workspace. Try again.');
    }
  }

  return (
    <div className="min-h-full bg-ink text-white">
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <Logo light />
        {done ? (
          <div className="mt-8">
            <h1 className="font-display text-3xl font-700 leading-tight">"{done.name}" is ready.</h1>
            <p className="mt-2 text-white/60">One thing to save before you continue:</p>
            <div className="mt-6 rounded-xl border border-signal/40 bg-ink-700/60 p-4">
              <p className="text-xs font-600 uppercase tracking-wide text-white/50">Your router agent token</p>
              <p className="mt-2 break-all font-mono text-sm text-signal-300">{done.agentToken}</p>
              <button
                className="btn-primary mt-3 w-full"
                onClick={() => { navigator.clipboard.writeText(done.agentToken).then(() => setCopied(true)); }}>
                {copied ? 'Copied ✓' : 'Copy token'}
              </button>
              <p className="mt-3 text-xs text-white/50">
                This token connects your MikroTik routers to your workspace. It is shown only once —
                store it somewhere safe. (You can rotate it later, which invalidates this one.)
              </p>
            </div>
            <Link to="/login" className="btn-primary mt-6 block w-full text-center">Log in to your workspace</Link>
          </div>
        ) : (
          <>
            <h1 className="mt-8 font-display text-3xl font-700 leading-tight">Start your own workspace.</h1>
            <p className="mt-2 text-white/60">Run your WISP on RedZone — subscribers, billing, collections, and router control.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
              <div>
                <label className="label text-white/50">Business / network name</label>
                <input className="input bg-ink-700 border-ink-600 text-white placeholder:text-white/30"
                  placeholder="e.g. Barrio WiFi Networks" {...register('tenantName', { required: true, minLength: 2 })} />
                {errors.tenantName && <p className="mt-1 text-xs text-signal-300">Give your workspace a name (2+ characters).</p>}
              </div>
              <div>
                <label className="label text-white/50">Your name</label>
                <input className="input bg-ink-700 border-ink-600 text-white placeholder:text-white/30"
                  placeholder="Owner's full name" {...register('ownerName', { required: true })} />
              </div>
              <div>
                <label className="label text-white/50">Email</label>
                <input className="input bg-ink-700 border-ink-600 text-white placeholder:text-white/30"
                  type="email" autoComplete="email" placeholder="you@example.com" {...register('email', { required: true })} />
              </div>
              <div>
                <label className="label text-white/50">Password</label>
                <input className="input bg-ink-700 border-ink-600 text-white placeholder:text-white/30"
                  type="password" autoComplete="new-password" placeholder="At least 8 characters"
                  {...register('password', { required: true, minLength: 8 })} />
                {errors.password && <p className="mt-1 text-xs text-signal-300">Use at least 8 characters.</p>}
              </div>
              {error && <p className="text-sm text-signal-300">{error}</p>}
              <button className="btn-primary w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating workspace…' : 'Create my workspace'}
              </button>
            </form>
            <p className="mt-6 text-center text-xs text-white/40">
              Already have an account? <Link to="/login" className="font-600 text-white/60">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
