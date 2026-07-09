import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useJobs, useUpdateJob, useStaff, useAttendance } from '../../hooks/queries';
import type { Job, JobStatus } from '../../api/types';
import { Spinner, EmptyState, JobStatusPill } from '../../components/ui';

const FILTERS = [
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: '', label: 'All' },
];

export default function Installations() {
  const [view, setView] = useState<'jobs' | 'attendance'>('jobs');
  const [status, setStatus] = useState('SCHEDULED');
  const [assignJob, setAssignJob] = useState<Job | null>(null);
  const { data: jobs, isLoading } = useJobs(status ? { status } : undefined);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-700">Installations & jobs</h1>
        <p className="text-sm text-ink/50">Schedule installs and repairs, assign technicians.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setView('jobs')}
          className={`pill border ${view === 'jobs' ? 'border-ink bg-ink text-white' : 'border-line text-ink/60'}`}>Jobs</button>
        <button onClick={() => setView('attendance')}
          className={`pill border ${view === 'attendance' ? 'border-ink bg-ink text-white' : 'border-line text-ink/60'}`}>Technician attendance</button>
      </div>

      {view === 'attendance' ? <AttendanceView /> : (
      <>
      <div className="flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setStatus(f.key)}
            className={`pill whitespace-nowrap border ${status === f.key ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink/60'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : !jobs?.length ? (
        <EmptyState title="No jobs here" hint="New subscribers automatically get an installation job." />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {jobs.map((j) => (
            <button key={j.id} onClick={() => setAssignJob(j)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-paper">
              <div className="min-w-0">
                <p className="truncate font-600">
                  {j.subscriber.fullName}
                  <span className="ml-2 text-xs font-500 text-ink/40">
                    {j.type === 'INSTALLATION' ? 'Install' : 'Repair'}
                  </span>
                </p>
                <p className="truncate text-xs text-ink/50">
                  {j.subscriber.municipality || '—'}
                  {j.scheduledAt ? ` · ${new Date(j.scheduledAt).toLocaleDateString('en-PH')}` : ' · unscheduled'}
                </p>
              </div>
              <JobStatusPill status={j.status} />
            </button>
          ))}
        </div>
      )}
      </>
      )}

      {assignJob && <AssignModal job={assignJob} onClose={() => setAssignJob(null)} />}
    </div>
  );
}

function AttendanceView() {
  const { data, isLoading } = useAttendance();
  if (isLoading) return <Spinner />;
  if (!data?.length) return <EmptyState title="No attendance today" hint="Technician check-ins will appear here." />;

  return (
    <div className="card divide-y divide-line overflow-hidden">
      {data.map((a) => {
        const maps = a.gpsLat != null && a.gpsLng != null
          ? `https://www.google.com/maps/search/?api=1&query=${a.gpsLat},${a.gpsLng}` : null;
        return (
          <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <p className="truncate font-600">{a.technicianName}</p>
              <p className="text-xs text-ink/50">
                In {new Date(a.timeIn).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                {a.timeOut ? ` · Out ${new Date(a.timeOut).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}` : ''}
              </p>
            </div>
            {maps ? (
              <a href={maps} target="_blank" rel="noreferrer" className="pill border border-line text-signal-600">
                📍 Location
              </a>
            ) : (
              <span className="pill bg-ink/5 text-ink/40">No GPS</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface AssignForm { technicianId: string; scheduledAt: string; status: JobStatus; notes: string; }

function AssignModal({ job, onClose }: { job: Job; onClose: () => void }) {
  const update = useUpdateJob();
  const { data: staff } = useStaff();
  const technicians = (staff ?? []).filter((u) => u.role === 'TECHNICIAN');
  const { register, handleSubmit } = useForm<AssignForm>({
    defaultValues: {
      technicianId: job.technicianId || '',
      scheduledAt: job.scheduledAt ? job.scheduledAt.slice(0, 10) : '',
      status: job.status,
      notes: job.notes || '',
    },
  });

  async function submit(v: AssignForm) {
    await update.mutateAsync({
      id: job.id,
      technicianId: v.technicianId || null,
      scheduledAt: v.scheduledAt ? new Date(v.scheduledAt).toISOString() : null,
      status: v.status,
      notes: v.notes || null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">{job.subscriber.fullName}</h2>
        <p className="text-sm text-ink/50">{job.type === 'INSTALLATION' ? 'Installation' : 'Repair'} · {job.subscriber.accountNo}</p>
        <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-3">
          <div>
            <label className="label">Technician</label>
            <select className="input" {...register('technicianId')}>
              <option value="">— Unassigned —</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {technicians.length === 0 && (
              <p className="mt-1 text-xs text-ink/40">No technicians yet. Add one in Staff.</p>
            )}
          </div>
          <div>
            <label className="label">Scheduled date</label>
            <input className="input" type="date" {...register('scheduledAt')} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" {...register('status')}>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} {...register('notes')} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
