import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AxiosError } from 'axios';
import { usePublicPlans, useSubmitRegistration } from '../hooks/queries';
import { Logo } from '../components/ui';
import { LocationSelect } from '../components/LocationSelect';
import { peso } from '../api/types';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ error?: string }>;
  return e?.response?.data?.error || fallback;
}

export default function Register() {
  const { data: plans } = usePublicPlans();
  const submit = useSubmitRegistration();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [barangay, setBarangay] = useState('');
  const [sitio, setSitio] = useState('');
  const [address, setAddress] = useState('');
  const [servicePlanId, setServicePlanId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !phone.trim()) {
      setError('Please enter your name and mobile number.');
      return;
    }
    try {
      await submit.mutateAsync({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        municipality: municipality || undefined,
        barangay: barangay || undefined,
        sitio: sitio || undefined,
        address: address || undefined,
        servicePlanId: servicePlanId || undefined,
        notes: notes || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(apiError(err, 'Something went wrong. Please try again.'));
    }
  }

  if (done) {
    return (
      <div className="min-h-full bg-paper">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-good/15 text-3xl">✓</div>
          <h1 className="mt-6 font-display text-2xl font-700">Application received!</h1>
          <p className="mt-2 text-ink/60">
            Salamat, {fullName.split(' ')[0]}! Our team will contact you on <span className="font-600">{phone}</span> to
            confirm coverage and schedule your installation.
          </p>
          <Link to="/register" onClick={() => window.location.reload()} className="btn-ghost mx-auto mt-6">
            Submit another
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-paper">
      <div className="mx-auto max-w-lg px-5 py-8">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-700">Sign up for internet</h1>
        <p className="mt-1 text-sm text-ink/60">
          Fill this in and our team will reach out to check coverage in your area and set up your installation.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div className="card space-y-3 p-5">
            <div>
              <label className="label">Full name *</label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Dela Cruz" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Mobile number *</label>
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0917xxxxxxx" inputMode="tel" />
              </div>
              <div>
                <label className="label">Email (optional)</label>
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" inputMode="email" />
              </div>
            </div>
          </div>

          <div className="card space-y-3 p-5">
            <p className="font-display font-600">Where should we install?</p>
            <LocationSelect municipality={municipality} barangay={barangay} onMunicipality={setMunicipality} onBarangay={setBarangay} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Sitio / Purok</label>
                <input className="input" value={sitio} onChange={(e) => setSitio(e.target.value)} placeholder="e.g. Purok 3" />
              </div>
              <div>
                <label className="label">House / landmark</label>
                <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="near the chapel" />
              </div>
            </div>
          </div>

          {plans && plans.length > 0 && (
            <div className="card space-y-3 p-5">
              <p className="font-display font-600">Choose a plan <span className="font-400 text-ink/40">(optional)</span></p>
              <div className="grid gap-2">
                {plans.map((p) => (
                  <button type="button" key={p.id} onClick={() => setServicePlanId(servicePlanId === p.id ? '' : p.id)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left ${servicePlanId === p.id ? 'border-signal-600 bg-signal/5' : 'border-line'}`}>
                    <div>
                      <p className="font-600">{p.name}</p>
                      <p className="text-xs text-ink/50">{Math.round(p.downloadKbps / 1024)} Mbps</p>
                    </div>
                    <span className="font-display font-700 text-signal-600">{peso(p.priceCents)}<span className="text-xs font-400 text-ink/40">/mo</span></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5">
            <label className="label">Anything else? (optional)</label>
            <textarea className="input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Best time to reach you, existing provider, etc." />
          </div>

          {error && <p className="text-sm text-bad">{error}</p>}
          <button className="btn-primary w-full" disabled={submit.isPending}>
            {submit.isPending ? 'Submitting…' : 'Submit application'}
          </button>
          <p className="text-center text-xs text-ink/40">
            Already a customer? <Link to="/login" className="font-600 text-signal-600">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
