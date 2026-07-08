import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useJobs, useStartJob, useCompleteJob } from '../../hooks/queries';
import type { Job, JobStatus } from '../../api/types';
import { Logo, Spinner, SignalMark } from '../../components/ui';
import { AttendanceCard } from '../../components/AttendanceCard';

const STATUS_STYLE: Record<JobStatus, string> = {
  SCHEDULED: 'bg-signal/15 text-warn',
  IN_PROGRESS: 'bg-ink/10 text-ink/70',
  COMPLETED: 'bg-good/10 text-good',
  CANCELLED: 'bg-ink/5 text-ink/40',
};
const STATUS_LABEL: Record<JobStatus, string> = {
  SCHEDULED: 'Scheduled', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

export default function Technician() {
  const { user, logout } = useAuth();
  const [openJob, setOpenJob] = useState<Job | null>(null);
  const { data: jobs, isLoading } = useJobs();

  const active = (jobs ?? []).filter((j) => j.status === 'SCHEDULED' || j.status === 'IN_PROGRESS');
  const doneToday = (jobs ?? []).filter((j) => j.status === 'COMPLETED');

  if (openJob) return <JobDetail job={openJob} onBack={() => setOpenJob(null)} />;

  return (
    <div className="min-h-full bg-paper pb-10">
      <header className="bg-ink px-5 pb-5 pt-5 text-white">
        <div className="flex items-center justify-between">
          <Logo light />
          <button onClick={logout} className="text-sm font-600 text-white/60">Sign out</button>
        </div>
        <p className="mt-4 text-sm text-white/50">Technician</p>
        <h1 className="font-display text-xl font-700">{user?.name}</h1>
      </header>

      <main className="mx-auto max-w-md px-4 py-5 space-y-5">
        <AttendanceCard />

        <section>
          <h2 className="mb-2 font-display font-600">My jobs</h2>
          {isLoading ? <Spinner /> : active.length === 0 ? (
            <div className="card px-6 py-10 text-center">
              <SignalMark className="mx-auto h-8 w-8 text-ink/20" />
              <p className="mt-2 text-sm text-ink/50">No jobs assigned right now.</p>
            </div>
          ) : (
            <div className="card divide-y divide-line overflow-hidden">
              {active.map((j) => (
                <button key={j.id} onClick={() => setOpenJob(j)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left active:bg-paper">
                  <div className="min-w-0">
                    <p className="truncate font-600">{j.subscriber.fullName}</p>
                    <p className="truncate text-xs text-ink/50">
                      {j.type === 'INSTALLATION' ? 'Install' : 'Repair'}
                      {j.subscriber.barangay ? ` · ${j.subscriber.barangay}` : ''}
                      {j.subscriber.municipality ? `, ${j.subscriber.municipality}` : ''}
                    </p>
                  </div>
                  <span className={`pill shrink-0 ${STATUS_STYLE[j.status]}`}>{STATUS_LABEL[j.status]}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {doneToday.length > 0 && (
          <section>
            <h2 className="mb-2 font-display font-600">Completed</h2>
            <div className="card divide-y divide-line overflow-hidden">
              {doneToday.map((j) => (
                <div key={j.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="truncate">{j.subscriber.fullName}</span>
                  <span className="pill bg-good/10 text-good">Done</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

interface CompleteForm { equipmentUsed?: string; cpeModel?: string; serialNo?: string; routerMac?: string; notes?: string; }

function JobDetail({ job, onBack }: { job: Job; onBack: () => void }) {
  const start = useStartJob();
  const complete = useCompleteJob();
  const [done, setDone] = useState(false);
  const { register, handleSubmit } = useForm<CompleteForm>();

  const s = job.subscriber;
  const mapsUrl = s.gpsLat && s.gpsLng
    ? `https://www.google.com/maps/search/?api=1&query=${s.gpsLat},${s.gpsLng}`
    : null;

  async function submit(v: CompleteForm) {
    await complete.mutateAsync({ id: job.id, ...v });
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-full bg-paper p-4">
        <div className="card mx-auto mt-10 max-w-md p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-good/10 text-2xl text-good">✓</div>
          <h2 className="mt-3 font-display text-lg font-700">Job completed</h2>
          <p className="mt-1 text-sm text-ink/60">{s.fullName}</p>
          {job.type === 'INSTALLATION' && <p className="mt-1 text-sm text-good">Subscriber activated.</p>}
          <button className="btn-primary mt-5 w-full" onClick={onBack}>Back to my jobs</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-paper pb-10">
      <header className="bg-ink px-5 pb-5 pt-5 text-white">
        <button onClick={onBack} className="text-sm font-600 text-white/60">← My jobs</button>
        <h1 className="mt-3 font-display text-xl font-700">{s.fullName}</h1>
        <p className="text-sm text-white/50">{job.type === 'INSTALLATION' ? 'Installation' : 'Repair'} · {s.accountNo}</p>
      </header>

      <main className="mx-auto max-w-md px-4 py-5 space-y-4">
        <div className="card p-5 text-sm">
          <p className="text-xs font-600 uppercase tracking-wide text-ink/40">Location</p>
          <p className="mt-1">{s.address || '—'}</p>
          <p className="text-ink/60">
            {[s.barangay, s.municipality].filter(Boolean).join(', ') || ''}
          </p>
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn-ghost mt-3 w-full">
              Open in Maps
            </a>
          )}
        </div>

        {job.status === 'SCHEDULED' && (
          <button className="btn-dark w-full" onClick={() => start.mutate(job.id)} disabled={start.isPending}>
            {start.isPending ? 'Starting…' : 'Start job'}
          </button>
        )}

        <form onSubmit={handleSubmit(submit)} className="card space-y-3 p-5">
          <h2 className="font-display font-600">Complete job</h2>
          <div>
            <label className="label">Equipment used</label>
            <input className="input text-base" placeholder="e.g. 1× ONT, 50m drop cable" {...register('equipmentUsed')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">CPE model</label>
              <input className="input text-base" {...register('cpeModel')} />
            </div>
            <div>
              <label className="label">Serial no.</label>
              <input className="input text-base" {...register('serialNo')} />
            </div>
          </div>
          <div>
            <label className="label">Router MAC</label>
            <input className="input text-base" {...register('routerMac')} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input text-base" rows={2} {...register('notes')} />
          </div>
          <button className="btn-primary w-full" disabled={complete.isPending}>
            {complete.isPending ? 'Saving…' : job.type === 'INSTALLATION' ? 'Complete & activate' : 'Complete job'}
          </button>
        </form>
      </main>
    </div>
  );
}
