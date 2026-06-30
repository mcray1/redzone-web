import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSubscriber, useTickets, useCreateTicket } from '../../hooks/queries';
import { peso } from '../../api/types';
import { Logo, Spinner, StatusPill, SignalMark } from '../../components/ui';
import { TicketThread, ticketStatusStyle, ticketStatusLabel } from '../../components/TicketThread';

/**
 * Customer portal. For this first build the logged-in customer's subscriber
 * record is resolved by the `branchId` field we stash as their subscriber id
 * at login time. When the backend gains a dedicated /me endpoint, swap the
 * lookup below for that.
 */
export default function Portal() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  // Customer accounts carry their subscriber id in `branchId` for now.
  const { data: s, isLoading } = useSubscriber(user?.branchId ?? undefined);

  return (
    <div className="min-h-full bg-paper pb-10">
      <header className="bg-ink px-5 pb-8 pt-5 text-white">
        <div className="flex items-center justify-between">
          <Logo light />
          <button onClick={() => { logout(); nav('/login'); }} className="text-sm font-600 text-white/60">
            Sign out
          </button>
        </div>
        <p className="mt-6 text-sm text-white/50">Hello,</p>
        <h1 className="font-display text-2xl font-700">{user?.name}</h1>
      </header>

      <main className="mx-auto -mt-5 max-w-md space-y-4 px-4">
        {isLoading ? <Spinner /> : !s ? (
          <div className="card p-6 text-center">
            <SignalMark className="mx-auto h-8 w-8 text-ink/20" />
            <p className="mt-2 font-600">No account linked</p>
            <p className="mt-1 text-sm text-ink/50">Contact RedZone support to link your subscription.</p>
          </div>
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
