import type { SubscriberStatus, JobStatus } from '../api/types';

// Signature element: signal bars climbing — RedZone bringing connectivity.
export function SignalMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="14" width="4" height="8" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="8" y="9" width="4" height="13" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="14" y="4" width="4" height="18" rx="1" fill="#f5a623" />
      <rect x="20" y="0" width="2.5" height="22" rx="1.25" fill="#f5a623" opacity="0.4" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <SignalMark className={light ? 'h-6 w-6 text-white' : 'h-6 w-6 text-ink'} />
      <span className={`font-display text-lg font-700 tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
        Red<span className="text-signal">Zone</span>
      </span>
    </div>
  );
}

const STATUS_STYLE: Record<SubscriberStatus, string> = {
  ACTIVE: 'bg-good/10 text-good',
  PENDING_INSTALLATION: 'bg-signal/15 text-warn',
  SUSPENDED: 'bg-bad/10 text-bad',
  DISCONNECTED: 'bg-ink/10 text-ink/70',
  ARCHIVED: 'bg-ink/5 text-ink/40',
};
const STATUS_LABEL: Record<SubscriberStatus, string> = {
  ACTIVE: 'Active',
  PENDING_INSTALLATION: 'Pending install',
  SUSPENDED: 'Suspended',
  DISCONNECTED: 'Disconnected',
  ARCHIVED: 'Archived',
};

export function StatusPill({ status }: { status: SubscriberStatus }) {
  return (
    <span className={`pill ${STATUS_STYLE[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

const JOB_STATUS_STYLE: Record<JobStatus, string> = {
  SCHEDULED: 'bg-signal/15 text-warn',
  IN_PROGRESS: 'bg-ink/10 text-ink/70',
  COMPLETED: 'bg-good/10 text-good',
  CANCELLED: 'bg-ink/5 text-ink/40',
};
const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  SCHEDULED: 'Scheduled', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};
export function JobStatusPill({ status }: { status: JobStatus }) {
  return <span className={`pill shrink-0 ${JOB_STATUS_STYLE[status]}`}>{JOB_STATUS_LABEL[status]}</span>;
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-10 text-ink/40">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-signal" />
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <SignalMark className="h-8 w-8 text-ink/20" />
      <p className="font-display font-600 text-ink">{title}</p>
      {hint && <p className="max-w-sm text-sm text-ink/50">{hint}</p>}
    </div>
  );
}
