import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSubscriber, useRecordPayment, useCreateCustomerLogin, useSetSubscriberStatus, useUpdateSubscriber, usePlans, useVoidPayment, useProrate } from '../../hooks/queries';
import { useAuth } from '../../context/AuthContext';
import { peso, type SubscriberStatus, type Subscriber } from '../../api/types';
import { Spinner, StatusPill } from '../../components/ui';
import { LocationSelect } from '../../components/LocationSelect';
import { FileUpload } from '../../components/FileUpload';
import { ProofLink } from '../../components/ProofLink';
import { CpePanel } from '../../components/CpePanel';
import { MapThumbnail } from '../../components/MapThumbnail';
import { VendoPanel } from '../../components/VendoPanel';

export default function SubscriberDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: s, isLoading } = useSubscriber(id);
  const { hasPerm } = useAuth();
  const [payOpen, setPayOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading || !s) return <Spinner />;

  return (
    <div className="space-y-5">
      <button onClick={() => nav(-1)} className="text-sm font-600 text-ink/50">← Back</button>

      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl font-700">{s.fullName}</h1>
            <p className="text-sm text-ink/50">{s.accountNo}</p>
          </div>
          <div className="flex items-center gap-3">
            {hasPerm('subscribers.edit') && (
              <button className="text-sm font-600 text-signal-600" onClick={() => setEditOpen(true)}>Edit</button>
            )}
            {s.accountType === 'VENDO' && <span className="pill bg-signal/15 text-signal-600">Vendo</span>}
            {s.billingExempt && <span className="pill bg-ink/10 text-ink/60">Free</span>}
            <StatusPill status={s.status} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <Field label="Plan" value={s.servicePlan?.name ?? '—'} />
          <Field label="Monthly" value={s.servicePlan ? peso(s.servicePlan.priceCents) : '—'} />
          <Field label="Balance" value={peso(s.balanceCents)} danger={s.balanceCents > 0} />
          <Field label="Due day" value={`Day ${s.dueDay}`} />
          <Field label="Phone" value={s.phone ?? '—'} />
          <Field label="Email" value={s.email ?? '—'} />
          <Field label="Sitio / Purok" value={s.sitio ?? '—'} />
          <Field label="Barangay" value={s.barangay ?? '—'} />
          <Field label="Municipality" value={s.municipality ?? '—'} />
          <Field label="PPPoE username" value={s.pppoeUsername ?? '—'} />
          {s.accountType === 'VENDO' && <Field label="Vendo no." value={s.vendoNumber ?? '—'} />}
          {s.accountType === 'VENDO' && <Field label="Vendo name" value={s.vendoName ?? '—'} />}
          {s.accountType === 'VENDO' && (
            <Field label="Est. clients" value={s.estimatedClients != null ? String(s.estimatedClients) : '—'} />
          )}
        </div>

        {s.gpsLat != null && s.gpsLng != null && (
          <div className="mt-4">
            <MapThumbnail lat={s.gpsLat} lng={s.gpsLng} />
          </div>
        )}

        {(() => {
          const ext = s.extensions?.find((e) => e.status === 'APPROVED');
          return ext ? (
            <p className="mt-4 rounded-lg bg-good/10 px-3 py-2 text-sm text-good">
              Payment extension approved — until {new Date(ext.approvedDate || ext.requestedDate).toLocaleDateString('en-PH')}
            </p>
          ) : null;
        })()}

        {hasPerm('subscribers.status') && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <StatusControl id={s.id} current={s.status} />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => setPayOpen(true)}>Record payment</button>
          {hasPerm('billing.prorate') && <ProrateButton subscriberId={s.id} hasPlan={!!s.servicePlan} />}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-600">Payment history</h2>
        {s.payments?.length ? (
          <ul className="mt-3 divide-y divide-line">
            {s.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className={p.voided ? 'opacity-50' : ''}>
                  <p className={`font-600 ${p.voided ? 'line-through' : ''}`}>{peso(p.amountCents)}</p>
                  <p className="text-xs text-ink/50">
                    {p.method} · {new Date(p.createdAt).toLocaleDateString('en-PH')}
                    {p.voided && <span className="ml-1 text-bad">· voided</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {p.proofUrl && <ProofLink path={p.proofUrl} label="Proof" />}
                  <span className="font-mono text-xs text-ink/40">{p.receiptNo}</span>
                  {!p.voided && hasPerm('payments.void') && <VoidButton paymentId={p.id} subscriberId={s.id} />}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink/40">No payments recorded yet.</p>
        )}
      </div>

      {/* Vendo income & expenses — only for vendo sites */}
      {s.accountType === 'VENDO' && <VendoPanel subscriberId={s.id} />}

      {/* Customer equipment (GenieACS) — renders only when the integration is on */}
      <CpePanel subscriberId={s.id} />

      {/* Customer portal login */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-600">Customer portal login</h2>
            <p className="text-sm text-ink/50">
              {s.loginUser
                ? <>Active login: <span className="font-mono">{s.loginUser.email}</span></>
                : 'No login yet. Create one so this customer can view their account online.'}
            </p>
          </div>
        </div>
        {hasPerm('subscribers.login') && (
          <button className="btn-ghost mt-3 w-full md:w-auto" onClick={() => setLoginOpen(true)}>
            {s.loginUser ? 'Reset login' : 'Create login'}
          </button>
        )}
      </div>

      {editOpen && <EditSubscriberModal sub={s} onClose={() => setEditOpen(false)} />}
      {payOpen && <PaymentModal subscriberId={s.id} balanceCents={s.balanceCents} onClose={() => setPayOpen(false)} />}
      {loginOpen && (
        <CustomerLoginModal
          subscriberId={s.id}
          existingEmail={s.loginUser?.email ?? null}
          suggestedEmail={s.email ?? ''}
          onClose={() => setLoginOpen(false)}
        />
      )}
    </div>
  );
}

interface LoginVals { email: string; password: string; }

function CustomerLoginModal({ subscriberId, existingEmail, suggestedEmail, onClose }:
  { subscriberId: string; existingEmail: string | null; suggestedEmail: string; onClose: () => void }) {
  const createLogin = useCreateCustomerLogin();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ email: string; password: string } | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginVals>({
    defaultValues: { email: existingEmail || suggestedEmail },
  });

  async function submit(v: LoginVals) {
    setError(null);
    try {
      await createLogin.mutateAsync({ subscriberId, email: v.email, password: v.password });
      setDone({ email: v.email, password: v.password });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Could not create the login.');
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-good/10 text-good">✓</div>
            <h2 className="mt-3 font-display text-lg font-700">Login ready</h2>
            <p className="mt-2 text-sm text-ink/60">Share these with the customer:</p>
            <div className="mt-3 rounded-lg bg-paper p-3 text-left text-sm">
              <p>Email: <span className="font-mono">{done.email}</span></p>
              <p>Password: <span className="font-mono">{done.password}</span></p>
            </div>
            <p className="mt-2 text-xs text-ink/40">They sign in at portal.redzone.com.ph</p>
            <button className="btn-dark mt-5 w-full" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <h2 className="font-display text-lg font-700">{existingEmail ? 'Reset login' : 'Create login'}</h2>
            <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-3">
              <div>
                <label className="label">Email (customer signs in with this)</label>
                <input className="input" type="email" {...register('email', { required: true })} />
                {errors.email && <p className="mt-1 text-xs text-bad">Required</p>}
              </div>
              <div>
                <label className="label">Temporary password</label>
                <input className="input" type="text" {...register('password', { required: true, minLength: 8 })} />
                {errors.password && <p className="mt-1 text-xs text-bad">At least 8 characters</p>}
              </div>
              {error && <p className="text-sm text-bad">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
                <button className="btn-primary flex-1" disabled={createLogin.isPending}>
                  {createLogin.isPending ? 'Saving…' : existingEmail ? 'Reset' : 'Create'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

interface EditVals {
  fullName: string; phone?: string; email?: string; address?: string; sitio?: string;
  municipality?: string; barangay?: string; servicePlanId?: string; dueDay?: number; lateFeeEnabled?: boolean;
  billingExempt?: boolean; pppoeUsername?: string; vendoName?: string; vendoNumber?: string; estimatedClients?: number;
}

function EditSubscriberModal({ sub, onClose }: { sub: Subscriber; onClose: () => void }) {
  const update = useUpdateSubscriber();
  const { data: plans } = usePlans();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<EditVals>({
    defaultValues: {
      fullName: sub.fullName,
      phone: sub.phone ?? '',
      email: sub.email ?? '',
      address: sub.address ?? '',
      sitio: sub.sitio ?? '',
      municipality: sub.municipality ?? '',
      barangay: sub.barangay ?? '',
      servicePlanId: sub.servicePlan?.id ?? '',
      dueDay: sub.dueDay,
      lateFeeEnabled: sub.lateFeeEnabled ?? false,
      billingExempt: sub.billingExempt ?? false,
      pppoeUsername: sub.pppoeUsername ?? '',
      vendoName: sub.vendoName ?? '',
      vendoNumber: sub.vendoNumber ?? '',
      estimatedClients: sub.estimatedClients ?? undefined,
    },
  });
  const isVendo = sub.accountType === 'VENDO';
  const municipality = watch('municipality') || '';
  const barangay = watch('barangay') || '';

  async function submit(v: EditVals) {
    setError(null);
    try {
      await update.mutateAsync({
        id: sub.id,
        data: {
          fullName: v.fullName,
          phone: v.phone,
          email: v.email,
          address: v.address,
          sitio: v.sitio,
          municipality: v.municipality,
          barangay: v.barangay,
          servicePlanId: v.servicePlanId,
          dueDay: v.dueDay ? Number(v.dueDay) : undefined,
          lateFeeEnabled: !!v.lateFeeEnabled,
          billingExempt: !!v.billingExempt,
          pppoeUsername: v.pppoeUsername,
          vendoName: isVendo ? v.vendoName : undefined,
          vendoNumber: isVendo ? v.vendoNumber : undefined,
          estimatedClients: isVendo && v.estimatedClients !== undefined && `${v.estimatedClients}` !== '' ? Number(v.estimatedClients) : undefined,
        },
      });
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Could not save the changes.');
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Edit subscriber</h2>
        <form onSubmit={handleSubmit(submit)} className="mt-4 grid grid-cols-2 gap-3">
          <input type="hidden" {...register('municipality')} />
          <input type="hidden" {...register('barangay')} />
          <div className="col-span-2">
            <label className="label">Full name</label>
            <input className="input" {...register('fullName', { required: true })} />
            {errors.fullName && <p className="mt-1 text-xs text-bad">Required</p>}
          </div>
          <div className="col-span-1">
            <label className="label">Phone</label>
            <input className="input" {...register('phone')} />
          </div>
          <div className="col-span-1">
            <label className="label">Email</label>
            <input className="input" type="email" {...register('email')} />
          </div>
          <div className="col-span-1">
            <label className="label">Address</label>
            <input className="input" {...register('address')} />
          </div>
          <div className="col-span-1">
            <label className="label">Sitio / Purok</label>
            <input className="input" {...register('sitio')} />
          </div>
          <div className="col-span-2">
            <LocationSelect
              municipality={municipality}
              barangay={barangay}
              onMunicipality={(v) => setValue('municipality', v)}
              onBarangay={(v) => setValue('barangay', v)}
            />
          </div>
          <div className="col-span-1">
            <label className="label">Due day</label>
            <input className="input" type="number" min={1} max={28} {...register('dueDay')} />
          </div>
          <div className="col-span-1">
            <label className="label">Service plan</label>
            <select className="input" {...register('servicePlanId')}>
              <option value="">— No plan —</option>
              {plans?.filter((p) => p.active).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({peso(p.priceCents)}/mo)</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">PPPoE username (links to the router account)</label>
            <input className="input" {...register('pppoeUsername')} placeholder="e.g. juan_delacruz" />
          </div>

          {isVendo && (
            <>
              <div>
                <label className="label">Vendo number</label>
                <input className="input" {...register('vendoNumber')} placeholder="e.g. V-012" />
              </div>
              <div>
                <label className="label">Vendo name</label>
                <input className="input" {...register('vendoName')} placeholder="e.g. Sari-sari corner" />
              </div>
              <div className="col-span-2">
                <label className="label">Estimated clients</label>
                <input className="input" type="number" min={0} {...register('estimatedClients')} />
              </div>
            </>
          )}

          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" {...register('lateFeeEnabled')} />
            Charge late fees on this account
          </label>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" {...register('billingExempt')} />
            Free account — never bill this subscriber
          </label>
          {error && <p className="col-span-2 text-sm text-bad">{error}</p>}
          <div className="col-span-2 mt-2 flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProrateButton({ subscriberId, hasPlan }: { subscriberId: string; hasPlan: boolean }) {
  const prorate = useProrate();
  const [result, setResult] = useState<{ fullCents: number; daysInMonth: number; daysCharged: number; proratedCents: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!hasPlan) return null;

  async function go() {
    setErr(null);
    if (!window.confirm('Create a prorated bill for this month (charging only the days left)?')) return;
    try {
      const r = await prorate.mutateAsync(subscriberId);
      setResult(r);
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErr(m || 'Could not create the prorated bill.');
    }
  }

  if (result) {
    return (
      <p className="w-full text-sm text-good">
        Prorated bill added: {peso(result.proratedCents)} ({result.daysCharged} of {result.daysInMonth} days of {peso(result.fullCents)}).
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <button className="btn-ghost" onClick={go} disabled={prorate.isPending}>
        {prorate.isPending ? 'Working…' : 'Prorated first bill'}
      </button>
      {err && <p className="text-xs text-bad">{err}</p>}
    </div>
  );
}

function VoidButton({ paymentId, subscriberId }: { paymentId: string; subscriberId: string }) {
  const voidPay = useVoidPayment();
  return (
    <button
      className="text-xs font-600 text-bad"
      disabled={voidPay.isPending}
      onClick={() => {
        const reason = window.prompt('Void this payment? Enter a reason (the amount goes back onto the balance):');
        if (reason && reason.trim()) {
          voidPay.mutate({ id: paymentId, reason: reason.trim(), subscriberId });
        }
      }}
    >
      Void
    </button>
  );
}

function Field({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-xs font-600 uppercase tracking-wide text-ink/40">{label}</p>
      <p className={`mt-0.5 font-500 ${danger ? 'text-bad' : 'text-ink'}`}>{value}</p>
    </div>
  );
}

interface PayVals { amount: number; method: string; reference?: string; }

function PaymentModal({ subscriberId, balanceCents, onClose }:
  { subscriberId: string; balanceCents: number; onClose: () => void }) {
  const pay = useRecordPayment();
  const [result, setResult] = useState<{ receiptNo: string; restored: boolean } | null>(null);
  const [proofPath, setProofPath] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<PayVals>({
    defaultValues: { amount: balanceCents > 0 ? balanceCents / 100 : undefined, method: 'CASH' },
  });

  async function submit(vals: PayVals) {
    const r = await pay.mutateAsync({
      subscriberId,
      amountCents: Math.round(Number(vals.amount) * 100),
      method: vals.method,
      reference: vals.reference || undefined,
      proofUrl: proofPath || undefined,
    });
    setResult({ receiptNo: r.receiptNo, restored: r.restored });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {result ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-good/10 text-good">✓</div>
            <h2 className="mt-3 font-display text-lg font-700">Payment recorded</h2>
            <p className="mt-1 text-sm text-ink/60">Receipt <span className="font-mono">{result.receiptNo}</span></p>
            {result.restored && <p className="mt-1 text-sm text-good">Service restored automatically.</p>}
            <button className="btn-dark mt-5 w-full" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <h2 className="font-display text-lg font-700">Record payment</h2>
            <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-3">
              <div>
                <label className="label">Amount (₱)</label>
                <input className="input" type="number" step="0.01" min="0"
                  {...register('amount', { required: true })} />
              </div>
              <div>
                <label className="label">Method</label>
                <select className="input" {...register('method')}>
                  <option value="CASH">Cash</option>
                  <option value="GCASH">GCash</option>
                  <option value="MAYA">Maya</option>
                  <option value="BANK">Bank transfer</option>
                </select>
              </div>
              <div>
                <label className="label">Reference (optional)</label>
                <input className="input" {...register('reference')} placeholder="GCash ref no., etc." />
              </div>
              <div>
                <label className="label">Proof of payment (optional)</label>
                <FileUpload kind="payment-proof" label="Attach screenshot / photo"
                  onUploaded={setProofPath} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
                <button className="btn-primary flex-1" disabled={pay.isPending}>
                  {pay.isPending ? 'Saving…' : 'Record'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function StatusControl({ id, current }: { id: string; current: SubscriberStatus }) {
  const setStatus = useSetSubscriberStatus();
  const STATUSES: Array<{ value: SubscriberStatus; label: string }> = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'PENDING_INSTALLATION', label: 'Pending install' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'DISCONNECTED', label: 'Disconnected' },
    { value: 'ARCHIVED', label: 'Archived' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {current === 'PENDING_INSTALLATION' && (
        <button
          className="btn-primary"
          onClick={() => setStatus.mutate({ id, status: 'ACTIVE' })}
          disabled={setStatus.isPending}>
          {setStatus.isPending ? 'Activating…' : 'Mark as Active'}
        </button>
      )}
      <label className="text-xs font-600 uppercase tracking-wide text-ink/40">Set status</label>
      <select
        className="input w-auto"
        value={current}
        onChange={(e) => setStatus.mutate({ id, status: e.target.value })}
        disabled={setStatus.isPending}>
        {STATUSES.map((st) => (
          <option key={st.value} value={st.value}>{st.label}</option>
        ))}
      </select>
    </div>
  );
}
