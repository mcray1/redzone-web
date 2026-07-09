import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useRegistrations, useApproveRegistration, useRejectRegistration, usePlans } from '../../hooks/queries';
import { peso, type Registration } from '../../api/types';
import { Spinner, EmptyState } from '../../components/ui';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ error?: string }>;
  return e?.response?.data?.error || fallback;
}

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: '', label: 'All' },
];

export default function Registrations() {
  const [status, setStatus] = useState('PENDING');
  const { data, isLoading } = useRegistrations(status || undefined);
  const [approving, setApproving] = useState<Registration | null>(null);
  const [rejecting, setRejecting] = useState<Registration | null>(null);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-700">Registrations</h1>
        <p className="text-sm text-ink/50">Client sign-ups from the public form. Approve to create a subscriber and installation job.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setStatus(f.key)}
            className={`pill whitespace-nowrap border ${status === f.key ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink/60'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : !data || data.length === 0 ? (
        <EmptyState title="Nothing here" hint={status === 'PENDING' ? 'No pending registrations right now.' : 'No registrations match this filter.'} />
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-700">{r.fullName}</p>
                    <span className={`pill text-[10px] ${r.type === 'VENDO' ? 'bg-signal/15 text-signal-600' : 'bg-ink/10 text-ink/50'}`}>
                      {r.type === 'VENDO' ? 'Vendo' : 'Plan'}
                    </span>
                  </div>
                  <p className="text-sm text-ink/60">{r.phone}{r.email ? ` · ${r.email}` : ''}</p>
                  <p className="mt-1 text-xs text-ink/50">
                    {[r.sitio, r.barangay, r.municipality].filter(Boolean).join(', ') || 'No address given'}
                    {r.address ? ` · ${r.address}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-ink/50">
                    {r.type === 'VENDO'
                      ? <>Vendo site{r.estimatedClients != null ? <> · est. <span className="font-600 text-ink/70">{r.estimatedClients}</span> clients</> : ''}</>
                      : <>Wants: <span className="font-600 text-ink/70">{r.servicePlan ? `${r.servicePlan.name} (${peso(r.servicePlan.priceCents)}/mo)` : 'No plan picked'}</span></>}
                    {' · '}{new Date(r.createdAt).toLocaleDateString('en-PH')}
                  </p>
                  {r.gpsLat != null && r.gpsLng != null && (
                    <a href={`https://www.google.com/maps?q=${r.gpsLat},${r.gpsLng}`} target="_blank" rel="noreferrer"
                      className="mt-1 inline-block text-xs font-600 text-signal-600">📍 View pinned location</a>
                  )}
                  {r.notes && <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-xs text-ink/60">“{r.notes}”</p>}
                  {r.status === 'REJECTED' && r.rejectReason && <p className="mt-2 text-xs text-bad">Rejected: {r.rejectReason}</p>}
                </div>
                <StatusTag status={r.status} />
              </div>

              {r.status === 'PENDING' && (
                <div className="mt-4 flex gap-2 border-t border-line pt-4">
                  <button className="btn-ghost text-bad" onClick={() => setRejecting(r)}>Reject</button>
                  <button className="btn-primary" onClick={() => setApproving(r)}>Approve &amp; create</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {approving && <ApproveModal reg={approving} onClose={() => setApproving(null)} />}
      {rejecting && <RejectModal reg={rejecting} onClose={() => setRejecting(null)} />}
    </div>
  );
}

function StatusTag({ status }: { status: Registration['status'] }) {
  const style = status === 'APPROVED' ? 'bg-good/10 text-good' : status === 'REJECTED' ? 'bg-bad/10 text-bad' : 'bg-signal/15 text-warn';
  return <span className={`pill shrink-0 ${style}`}>{status.toLowerCase()}</span>;
}

function ApproveModal({ reg, onClose }: { reg: Registration; onClose: () => void }) {
  const approve = useApproveRegistration();
  const { data: plans } = usePlans();
  const nav = useNavigate();
  const [accountNo, setAccountNo] = useState('');
  const [servicePlanId, setServicePlanId] = useState(reg.servicePlanId ?? '');
  const [dueDay, setDueDay] = useState('1');
  const [makeLogin, setMakeLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState(reg.email ?? '');
  const [loginPassword, setLoginPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setErr(null);
    if (!accountNo.trim()) { setErr('Enter an account number.'); return; }
    if (makeLogin && (!loginEmail.trim() || loginPassword.length < 8)) {
      setErr('For a portal login, enter an email and a password of at least 8 characters.');
      return;
    }
    try {
      const res = await approve.mutateAsync({
        id: reg.id,
        accountNo: accountNo.trim(),
        servicePlanId: servicePlanId || null,
        dueDay: Number(dueDay) || 1,
        loginEmail: makeLogin ? loginEmail.trim() : undefined,
        loginPassword: makeLogin ? loginPassword : undefined,
      });
      onClose();
      if (res?.subscriberId) nav(`/owner/subscribers/${res.subscriberId}`);
    } catch (e) {
      setErr(apiError(e, 'Could not approve.'));
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Approve — {reg.fullName}</h2>
        <p className="mt-1 text-sm text-ink/50">Creates a subscriber (pending installation) and an installation job.</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Account number *</label>
            <input className="input" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} placeholder="e.g. RZ-0421" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {reg.type !== 'VENDO' && (
              <div>
                <label className="label">Plan</label>
                <select className="input" value={servicePlanId} onChange={(e) => setServicePlanId(e.target.value)}>
                  <option value="">— None —</option>
                  {plans?.filter((p) => p.active !== false).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {peso(p.priceCents)}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">Due day</label>
              <input className="input" type="number" min={1} max={28} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            </div>
          </div>

          <div className="rounded-xl border border-line p-3">
            <label className="flex items-center gap-2 text-sm font-600">
              <input type="checkbox" className="h-4 w-4 accent-signal-600" checked={makeLogin} onChange={(e) => setMakeLogin(e.target.checked)} />
              Also create a portal login now
            </label>
            {makeLogin && (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input className="input" type="email" placeholder="login email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                <input className="input" type="text" placeholder="temp password (min 8)" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                <p className="text-xs text-ink/40 sm:col-span-2">Share this with the customer; they can change it after signing in.</p>
              </div>
            )}
          </div>

          {err && <p className="text-sm text-bad">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" disabled={approve.isPending} onClick={go}>
              {approve.isPending ? 'Creating…' : 'Approve & create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RejectModal({ reg, onClose }: { reg: Registration; onClose: () => void }) {
  const reject = useRejectRegistration();
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setErr(null);
    if (!reason.trim()) { setErr('Give a short reason.'); return; }
    try {
      await reject.mutateAsync({ id: reg.id, reason: reason.trim() });
      onClose();
    } catch (e) {
      setErr(apiError(e, 'Could not reject.'));
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Reject — {reg.fullName}</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className="label">Reason</label>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. outside coverage area" autoFocus />
          </div>
          {err && <p className="text-sm text-bad">{err}</p>}
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1 !bg-bad" disabled={reject.isPending} onClick={go}>
              {reject.isPending ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
