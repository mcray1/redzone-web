import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMyAccount, useTickets, useCreateTicket, useMyExtensions, useRequestExtension, useMyRegistration, useMyDiscounts, useRequestDiscount } from '../../hooks/queries';
import { peso } from '../../api/types';
import { Logo, Spinner, StatusPill, SignalMark } from '../../components/ui';
import { TicketThread, ticketStatusStyle, ticketStatusLabel } from '../../components/TicketThread';
import { ChangePasswordModal } from '../../components/ChangePasswordModal';

/**
 * Customer portal. The logged-in customer's subscriber record comes from the
 * /subscribers/me/account endpoint, resolved via the proper user→subscriber link.
 */
export default function Portal() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { data: s, isLoading } = useMyAccount();
  const [pwOpen, setPwOpen] = useState(false);

  return (
    <div className="min-h-full bg-paper pb-10">
      <header className="bg-ink px-5 pb-8 pt-5 text-white">
        <div className="flex items-center justify-between">
          <Logo light />
          <div className="flex items-center gap-3">
            <button onClick={() => setPwOpen(true)} className="text-sm font-600 text-white/60">
              Password
            </button>
            <button onClick={() => { logout(); nav('/login'); }} className="text-sm font-600 text-white/60">
              Sign out
            </button>
          </div>
        </div>
        <p className="mt-6 text-sm text-white/50">Hello,</p>
        <h1 className="font-display text-2xl font-700">{user?.name}</h1>
      </header>

      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}

      <main className="mx-auto -mt-5 max-w-md space-y-4 px-4">
        {isLoading ? <Spinner /> : !s ? (
          <ApplicationStatus />
        ) : (
          <>
            {/* Connection status card */}
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-600 uppercase tracking-wide text-ink/40">Connection</p>
                  <div className="mt-1"><StatusPill status={s.status} /></div>
                </div>
                <SignalMark className="h-9 w-9 text-ink" />
              </div>
              {s.servicePlan && (
                <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
                  <div>
                    <p className="font-display text-lg font-700">{s.servicePlan.name}</p>
                    <p className="text-xs text-ink/50">
                      {Math.round(s.servicePlan.downloadKbps / 1024)} Mbps
                    </p>
                  </div>
                  <p className="font-600">{peso(s.servicePlan.priceCents)}<span className="text-xs text-ink/40">/mo</span></p>
                </div>
              )}
            </div>

            {/* Balance card */}
            <div className={`card p-5 ${s.balanceCents > 0 ? 'border-bad/30' : ''}`}>
              <p className="text-xs font-600 uppercase tracking-wide text-ink/40">Current balance</p>
              <p className={`mt-1 font-display text-3xl font-700 ${s.balanceCents > 0 ? 'text-bad' : 'text-good'}`}>
                {peso(Math.max(0, s.balanceCents))}
              </p>
              {s.balanceCents > 0 ? (
                <p className="mt-1 text-sm text-ink/60">Due on day {s.dueDay} each month.</p>
              ) : (
                <p className="mt-1 text-sm text-good">You're all paid up. Thank you!</p>
              )}
              {s.balanceCents > 0 && (
                <div className="mt-4 rounded-lg bg-paper p-3 text-sm">
                  <p className="font-600">How to pay</p>
                  <p className="mt-1 text-ink/60">
                    Send via GCash or Maya to RedZone, then keep your reference number.
                    Your collector can also accept cash.
                  </p>
                </div>
              )}
            </div>

            {/* Payment extension */}
            <PortalExtension hasBalance={s.balanceCents > 0} />

            {/* Discount request */}
            <PortalDiscount hasBalance={s.balanceCents > 0} />

            {/* Payment history */}
            <div className="card p-5">
              <h2 className="font-display font-600">Recent payments</h2>
              {s.payments?.length ? (
                <ul className="mt-3 divide-y divide-line">
                  {s.payments.slice(0, 6).map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-600">{peso(p.amountCents)}</p>
                        <p className="text-xs text-ink/50">
                          {p.method} · {new Date(p.createdAt).toLocaleDateString('en-PH')}
                        </p>
                      </div>
                      <span className="text-xs font-mono text-ink/40">{p.receiptNo}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink/40">No payments on record yet.</p>
              )}
            </div>

            {/* Support tickets */}
            <PortalSupport />
          </>
        )}
      </main>
    </div>
  );
}

// Shown to a self-registered client who doesn't have a subscriber account yet:
// where their application stands.
function ApplicationStatus() {
  const { data: reg, isLoading } = useMyRegistration();
  if (isLoading) return <Spinner />;
  if (!reg) {
    return (
      <div className="card p-6 text-center">
        <SignalMark className="mx-auto h-8 w-8 text-ink/20" />
        <p className="mt-2 font-600">No account linked</p>
        <p className="mt-1 text-sm text-ink/50">Contact RedZone support to link your subscription.</p>
      </div>
    );
  }
  const view = {
    PENDING: { cls: 'bg-signal/15 text-warn', title: 'Application under review', body: 'Thanks for signing up! Our team is reviewing your application and will contact you to confirm coverage and schedule your installation.' },
    APPROVED: { cls: 'bg-good/10 text-good', title: 'Approved — installation coming up', body: 'Your application was approved and we are preparing your installation. This page becomes your account dashboard once you are activated.' },
    REJECTED: { cls: 'bg-bad/10 text-bad', title: 'Application not approved', body: reg.rejectReason ? `Reason: ${reg.rejectReason}` : 'Please contact RedZone support for more details.' },
  }[reg.status];
  return (
    <div className="card p-6">
      <span className={`pill ${view.cls}`}>{reg.status.toLowerCase()}</span>
      <h2 className="mt-3 font-display text-lg font-700">{view.title}</h2>
      <p className="mt-1 text-sm text-ink/60">{view.body}</p>
      <div className="mt-4 space-y-1 border-t border-line pt-4 text-sm text-ink/60">
        <p>For: <span className="font-600">{reg.type === 'VENDO' ? 'WiFi Vendo' : 'Home internet'}</span></p>
        {reg.servicePlan && <p>Plan: <span className="font-600">{reg.servicePlan.name}</span></p>}
        <p>Applied: {new Date(reg.createdAt).toLocaleDateString('en-PH')}</p>
      </div>
    </div>
  );
}

function PortalExtension({ hasBalance }: { hasBalance: boolean }) {
  const { data: exts } = useMyExtensions();
  const request = useRequestExtension();
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const pending = exts?.find((e) => e.status === 'PENDING');
  const approved = exts?.find((e) => e.status === 'APPROVED');

  async function submit() {
    setErr(null);
    setMsg(null);
    if (!date) { setErr('Pick a date you can pay by.'); return; }
    try {
      await request.mutateAsync({ requestedDate: date, reason: reason || undefined });
      setMsg("Request sent. We'll review it shortly.");
      setDate('');
      setReason('');
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErr(m || 'Could not send the request.');
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-display font-600">Payment extension</h2>
      {approved && (
        <p className="mt-1 text-sm text-good">
          Approved — you have until {new Date(approved.approvedDate || approved.requestedDate).toLocaleDateString('en-PH')} to pay.
        </p>
      )}
      {pending ? (
        <p className="mt-2 text-sm text-warn">
          Request pending — until {new Date(pending.requestedDate).toLocaleDateString('en-PH')}.
        </p>
      ) : hasBalance ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-ink/50">Need a little more time? Tell us when you can pay.</p>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input className="input" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          {err && <p className="text-sm text-bad">{err}</p>}
          {msg && <p className="text-sm text-good">{msg}</p>}
          <button className="btn-primary w-full" disabled={request.isPending} onClick={submit}>
            {request.isPending ? 'Sending…' : 'Request extension'}
          </button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink/40">You're paid up — no extension needed.</p>
      )}
    </div>
  );
}

function PortalDiscount({ hasBalance }: { hasBalance: boolean }) {
  const { data: mine } = useMyDiscounts();
  const request = useRequestDiscount();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const pending = mine?.find((d) => d.status === 'PENDING');
  const lastDecided = mine?.find((d) => d.status !== 'PENDING');

  async function submit() {
    setErr(null); setMsg(null);
    const amountCents = Math.round(Number(amount) * 100);
    if (!amountCents) { setErr('Enter an amount.'); return; }
    try {
      await request.mutateAsync({ amountCents, reason: reason || undefined });
      setMsg('Request sent. We\'ll review it.'); setAmount(''); setReason('');
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Could not send.');
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-display font-600">Request a discount</h2>
      {pending ? (
        <p className="mt-2 text-sm text-warn">A discount request of {peso(pending.amountCents)} is pending review.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {lastDecided && (
            <p className={`text-sm ${lastDecided.status === 'APPROVED' ? 'text-good' : 'text-ink/50'}`}>
              Last request: {lastDecided.status.toLowerCase()}{lastDecided.decisionNote ? ` — ${lastDecided.decisionNote}` : ''}.
            </p>
          )}
          <p className="text-sm text-ink/50">Ask for a discount on your bill (e.g. downtime, senior/PWD). Staff will review it.</p>
          <input className="input" inputMode="decimal" placeholder="Amount (₱)" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
          <input className="input" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          {err && <p className="text-sm text-bad">{err}</p>}
          {msg && <p className="text-sm text-good">{msg}</p>}
          <button className="btn-primary w-full" disabled={request.isPending || !hasBalance} onClick={submit}>
            {request.isPending ? 'Sending…' : 'Request discount'}
          </button>
          {!hasBalance && <p className="text-xs text-ink/40">You have no balance to discount right now.</p>}
        </div>
      )}
    </div>
  );
}

function PortalSupport() {
  const { data: tickets, isLoading } = useTickets();
  const createTicket = useCreateTicket();
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  if (openId) {
    return (
      <div className="card p-4">
        <TicketThread id={openId} onBack={() => setOpenId(null)} />
      </div>
    );
  }

  async function submit() {
    if (!subject.trim() || !body.trim()) return;
    await createTicket.mutateAsync({ subject: subject.trim(), body: body.trim() });
    setSubject(''); setBody(''); setComposing(false);
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-600">Support</h2>
        {!composing && (
          <button className="text-sm font-600 text-signal-600" onClick={() => setComposing(true)}>
            New request
          </button>
        )}
      </div>

      {composing ? (
        <div className="mt-3 space-y-2">
          <input className="input" placeholder="Subject (e.g. Slow connection)"
            value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea className="input min-h-[80px]" placeholder="Describe the issue…"
            value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => setComposing(false)}>Cancel</button>
            <button className="btn-primary flex-1" onClick={submit} disabled={createTicket.isPending}>
              {createTicket.isPending ? 'Sending…' : 'Submit'}
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <p className="mt-3 text-sm text-ink/40">Loading…</p>
      ) : tickets?.length ? (
        <ul className="mt-3 divide-y divide-line">
          {tickets.map((t) => (
            <li key={t.id}>
              <button onClick={() => setOpenId(t.id)} className="flex w-full items-center justify-between py-2.5 text-left">
                <span className="truncate text-sm font-600">{t.subject}</span>
                <span className={`pill shrink-0 ${ticketStatusStyle[t.status]}`}>{ticketStatusLabel[t.status]}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink/40">No support requests yet. Tap "New request" if you need help.</p>
      )}
    </div>
  );
}
