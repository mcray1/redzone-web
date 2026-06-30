import { useState } from 'react';
import { useTickets } from '../../hooks/queries';
import { Spinner, EmptyState } from '../../components/ui';
import { TicketThread, ticketStatusStyle, ticketStatusLabel } from '../../components/TicketThread';
import type { TicketStatus } from '../../api/types';

const FILTERS: Array<{ key: string; label: string }> = [
  { key: '', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'RESOLVED', label: 'Resolved' },
];

export default function Tickets() {
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: tickets, isLoading } = useTickets(status || undefined);

  if (openId) return <TicketThread id={openId} onBack={() => setOpenId(null)} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-700">Tickets</h1>
        <p className="text-sm text-ink/50">Customer support requests.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setStatus(f.key)}
            className={`pill whitespace-nowrap border ${status === f.key ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink/60'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : !tickets?.length ? (
        <EmptyState title="No tickets" hint="Customer support requests will appear here." />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {tickets.map((t) => (
            <button key={t.id} onClick={() => setOpenId(t.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-paper">
              <div className="min-w-0">
                <p className="truncate font-600">{t.subject}</p>
                <p className="truncate text-xs text-ink/50">
                  {t.subscriber ? `${t.subscriber.fullName} · ` : ''}{t._count?.messages ?? 0} message{(t._count?.messages ?? 0) === 1 ? '' : 's'}
                </p>
              </div>
              <span className={`pill shrink-0 ${ticketStatusStyle[t.status as TicketStatus]}`}>
                {ticketStatusLabel[t.status as TicketStatus]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
