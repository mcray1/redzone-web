import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useSubmitRegistration } from '../hooks/queries';
import { Logo } from '../components/ui';
import { LocationSelect } from '../components/LocationSelect';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ error?: string }>;
  return e?.response?.data?.error || fallback;
}

// Best-effort GPS grab. Resolves null if unsupported, denied, or timed out —
// never throws, so it can't block a submission.
function requestGps(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

export default function Register() {
  const submit = useSubmitRegistration();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [barangay, setBarangay] = useState('');
  const [sitio, setSitio] = useState('');
  const [address, setAddress] = useState('');
  const [estimatedClients, setEstimatedClients] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<'PLAN' | 'VENDO'>('PLAN');
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isVendo = type === 'VENDO';

  async function pinLocation() {
    setGeoBusy(true); setGeoMsg(null);
    const c = await requestGps();
    setGeoBusy(false);
    if (c) { setGps(c); setGeoMsg('Location pinned ✓'); }
    else setGeoMsg('Could not get your location — you can still submit.');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !phone.trim()) {
      setError('Please enter your name and mobile number.');
      return;
    }
    if (!email.trim() || password.length < 8) {
      setError('Please enter an email and a password of at least 8 characters — you will use these to sign in.');
      return;
    }
    if (isVendo) {
      if (!municipality || !barangay) { setError('Please choose the municipality and barangay for the vendo.'); return; }
      if (!address.trim()) { setError('Please add a landmark so we can find the exact spot.'); return; }
    }
    // Grab GPS one more time if not pinned yet — best-effort, never blocks.
    let coords = gps;
    if (!coords) coords = await requestGps();
    try {
      await submit.mutateAsync({
        type,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        municipality: municipality || undefined,
        barangay: barangay || undefined,
        sitio: sitio || undefined,
        address: address || undefined,
        gpsLat: coords?.lat,
        gpsLng: coords?.lng,
        estimatedClients: isVendo && estimatedClients ? Number(estimatedClients) : undefined,
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
            Salamat, {fullName.split(' ')[0]}! You can now <span className="font-600">sign in with your email</span> to
            track your application. Our team will contact you on <span className="font-600">{phone}</span> to confirm
            coverage and schedule your installation.
          </p>
          <Link to="/login" className="btn-primary mx-auto mt-6">Sign in to track it</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-paper">
      <div className="mx-auto max-w-lg px-5 py-8">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-700">Sign up with RedZone</h1>
        <p className="mt-1 text-sm text-ink/60">
          Fill this in and our team will reach out to check your area and set things up.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setType('PLAN')}
            className={`rounded-xl border px-4 py-3 text-left ${!isVendo ? 'border-signal-600 bg-signal/5' : 'border-line'}`}>
            <p className="font-600">Home internet</p>
            <p className="text-xs text-ink/50">A plan for your household</p>
          </button>
          <button type="button" onClick={() => setType('VENDO')}
            className={`rounded-xl border px-4 py-3 text-left ${isVendo ? 'border-signal-600 bg-signal/5' : 'border-line'}`}>
            <p className="font-600">WiFi Vendo</p>
            <p className="text-xs text-ink/50">Host a piso-WiFi machine</p>
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-5">
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
                <label className="label">Email *</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" inputMode="email" autoComplete="email" />
              </div>
            </div>
            <div>
              <label className="label">Create a password *</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="at least 8 characters" autoComplete="new-password" />
              <p className="mt-1 text-xs text-ink/40">You'll sign in with your email and this password to track your application.</p>
            </div>
          </div>

          <div className="card space-y-3 p-5">
            <p className="font-display font-600">{isVendo ? 'Where will the vendo be?' : 'Where should we install?'}</p>
            <LocationSelect municipality={municipality} barangay={barangay} onMunicipality={setMunicipality} onBarangay={setBarangay} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Sitio / Purok</label>
                <input className="input" value={sitio} onChange={(e) => setSitio(e.target.value)} placeholder="e.g. Purok 3" />
              </div>
              <div>
                <label className="label">House / landmark{isVendo ? ' *' : ''}</label>
                <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="near the chapel" />
              </div>
            </div>
            {isVendo && (
              <div>
                <label className="label">Estimated number of clients <span className="font-400 text-ink/40">(optional)</span></label>
                <input className="input" value={estimatedClients} onChange={(e) => setEstimatedClients(e.target.value.replace(/[^0-9]/g, ''))}
                  inputMode="numeric" placeholder="e.g. how many people nearby could use it" />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button type="button" onClick={pinLocation} disabled={geoBusy}
                className={`pill border ${gps ? 'border-good text-good' : 'border-signal-600 text-signal-600'}`}>
                {geoBusy ? 'Getting location…' : gps ? '📍 Location pinned' : '📍 Pin my current location'}
              </button>
              {geoMsg && <span className="text-xs text-ink/50">{geoMsg}</span>}
            </div>
            <p className="text-xs text-ink/40">Pinning helps our team find you faster. Please allow location access.</p>
          </div>

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
