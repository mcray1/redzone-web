import { useState } from 'react';
import { useTicket, useReplyTicket, useUpdateTicket } from '../hooks/queries';
import { useAuth } from '../context/AuthContext';
import type { TicketStatus } from '../api/types';
import { Spinner } from './ui';

const STATUS_STYLE: Record<TicketStatus, string> = {
  OPEN: 'bg-signal/15 text-warn',
  IN_PROGRESS: 'bg-ink/10 text-ink/70',
  RESOLVED: 'bg-good/10 text-good',
  CLOSED: 'bg-ink/5 text-ink/40',
};
const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved', CLOSED: 'Closed',
};

export function TicketThread({ id, onBack }: { id: string; onBack: () => void }) {
  const { user } = useAuth();
  const isStaff = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data: ticket, isLoading } = useTicket(id);
  const reply = useReplyTicket();
  const update = useUpdateTicket();
  const [text, setText] = useState('');

  if (isLoading || !ticket) return <Spinner />;

  async function send() {
    if (!text.trim()) return;
    await reply.mutateAsync({ id, body: text.trim() });
    setText('');
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm font-600 text-ink/50">← Back</button>

      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-700">{ticket.subject}</h2>
          <span className={`pill ${STATUS_STYLE[ticket.status]}`}>{STATUS_LABEL[ticket.status]}</span>
        </div>
        {ticket.subscriber && (
          <p className="mt-1 text-xs text-ink/50">{ticket.subscriber.fullName} · {ticket.subscriber.accountNo}</p>
        )}

        {isStaff && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as TicketStatus[]).map((s) => (
              <button key={s} onClick={() => update.mutate({ id, status: s })}
                className={`pill border text-xs ${ticket.status === s ? 'border-ink bg-ink text-white' : 'border-line text-ink/60'}`}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {ticket.messages.map((m) => (
          <div key={m.id} className={`flex ${m.isStaff ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${m.isStaff ? 'bg-white border border-line' : 'bg-ink text-white'}`}>
              <p className="text-xs font-600 opacity-70">{m.authorName}{m.isStaff ? ' · Staff' : ''}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm">{m.body}</p>
              <p className="mt-1 text-[10px] opacity-50">
                {new Date(m.createdAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {ticket.status !== 'CLOSED' && (
        <div className="card flex items-end gap-2 p-3">
          <textarea className="input min-h-[44px] flex-1 resize-none" rows={1} placeholder="Write a reply…"
            value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary" onClick={send} disabled={reply.isPending || !text.trim()}>Send</button>
        </div>
      )}
      {ticket.status === 'CLOSED' && (
        <p className="text-center text-sm text-ink/40">This ticket is closed.</p>
      )}
    </div>
  );
}

export { STATUS_STYLE as ticketStatusStyle, STATUS_LABEL as ticketStatusLabel };
