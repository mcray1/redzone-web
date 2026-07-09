import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOwnerStats, useBillingPreview, useRunBilling, useRemittances, useVerifyRemittance, useExtensions, useDecideExtension } from '../../hooks/queries';
import type { BillingRunResult } from '../../hooks/queries';
import { useAuth } from '../../context/AuthContext';
import { peso } from '../../api/types';
import { Spinner, StatusPill, EmptyState } from '../../components/ui';

export default function Billing() {
  const { data, isLoading } = useOwnerStats();
  const { user } = useAuth();
  const nav = useNavigate();
  if (isLoading || !data) return <Spinner />;

  const owing = data.owing;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-700">Billing</h1>
        <p className="text-sm text-ink/50">Accounts with outstanding balances.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card px-5 py-4">
          <p className="text-xs font-600 uppercase tracking-wide text-ink/50">Total outstanding</p>
          <p className="mt-1.5 font-display text-2xl font-700 text-bad">{peso(data.outstanding)}</p>
        </div>
        <div className="card px-5 py-4">
          <p className="text-xs font-600 uppercase tracking-wide text-ink/50">Accounts owing</p>
          <p className="mt-1.5 font-display text-2xl font-700">{data.owingCount}</p>
        </div>
      </div>

      {user?.role === 'OWNER' && <RunBillingPanel />}

      <ExtensionsPanel />
      <RemittancesPanel />

      {owing.length === 0 ? (
        <EmptyState title="Everyone's paid up" hint="No outstanding balances right now." />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {owing.map((s) => (
            <button key={s.id} onClick={() => nav(`/owner/subscribers/${s.id}`)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-paper">
              <div className="min-w-0">
                <p className="truncate font-600">{s.fullName}</p>
                <p className="text-xs text-ink/50">{s.accountNo} · due day {s.dueDay}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-600 text-bad">{peso(s.balanceCents)}</span>
                <StatusPill status={s.status} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Subscriber payment-extension (promise-to-pay) requests awaiting a decision. */
function ExtensionsPanel() {
  const { data } = useExtensions('PENDING');
  const decide = useDecideExtension();
  if (!data || data.length === 0) return null;

  return (
    <div className="card p-5">
      <h2 className="font-display font-600">Payment extension requests</h2>
      <ul className="mt-3 divide-y divide-line">
        {data.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-600">{e.subscriber?.fullName} — until {new Date(e.requestedDate).toLocaleDateString('en-PH')}</p>
              <p className="text-xs text-ink/50">
                {e.subscriber ? peso(e.subscriber.balanceCents) : ''}{e.reason ? ` · ${e.reason}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button className="btn-ghost text-bad" disabled={decide.isPending}
                onClick={() => decide.mutate({ id: e.id, status: 'REJECTED' })}>Reject</button>
              <button className="btn-primary" disabled={decide.isPending}
                onClick={() => decide.mutate({ id: e.id, status: 'APPROVED' })}>Approve</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Collector cash remittances awaiting verification. */
function RemittancesPanel() {
  const { data, isLoading } = useRemittances('PENDING');
  const verify = useVerifyRemittance();
  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  return (
    <div className="card p-5">
      <h2 className="font-display font-600">Collector remittances to verify</h2>
      <ul className="mt-3 divide-y divide-line">
        {data.map((r) => {
          const variance = r.varianceCents ?? 0;
          return (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-600">{r.collectorName} — {peso(r.submittedCents)}</p>
                <p className="text-xs text-ink/50">
                  expected {peso(r.expectedCents)}
                  {variance !== 0 && (
                    <span className={variance < 0 ? 'text-bad' : 'text-good'}>
                      {' '}· {variance < 0 ? 'short' : 'over'} {peso(Math.abs(variance))}
                    </span>
                  )}
                </p>
              </div>
              <button className="btn-primary shrink-0" disabled={verify.isPending}
                onClick={() => verify.mutate(r.id)}>Verify</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Owner-only monthly billing. Preview first (shows how many bills would be
 * created and how much they'd add), then confirm to actually generate. Running
 * it again in the same month is safe — it creates nothing new.
 */
function RunBillingPanel() {
  const preview = useBillingPreview();
  const run = useRunBilling();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<BillingRunResult | null>(null);

  const p = preview.data;

  return (
    <div className="card px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-600">Generate this month's bills</p>
          <p className="text-xs text-ink/50">
            Creates a monthly invoice for every active subscriber that has a plan, and adds it to their balance.
          </p>
        </div>
        {!confirming && !done && (
          <button
            className="btn-primary shrink-0"
            disabled={preview.isPending}
            onClick={() => {
              setDone(null);
              preview.mutate(undefined, { onSuccess: () => setConfirming(true) });
            }}
          >
            {preview.isPending ? 'Checking…' : 'Preview'}
          </button>
        )}
      </div>

      {/* Preview + confirm step */}
      {confirming && p && (
        <div className="mt-4 rounded-xl bg-paper p-4">
          {p.created === 0 ? (
            <p className="text-sm">
              Nothing to generate for <b>{p.period}</b> — all {p.eligible} eligible subscribers are already billed this month.
            </p>
          ) : (
            <p className="text-sm">
              This will create <b>{p.created}</b> new invoice{p.created === 1 ? '' : 's'} for <b>{p.period}</b>,
              adding <b className="text-bad">{peso(p.totalCents)}</b> in total to subscriber balances.
              {p.skipped > 0 && <span className="text-ink/50"> ({p.skipped} already billed or without a plan price are skipped.)</span>}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button className="btn-ghost" onClick={() => setConfirming(false)} disabled={run.isPending}>
              Cancel
            </button>
            {p.created > 0 && (
              <button
                className="btn-primary"
                disabled={run.isPending}
                onClick={() =>
                  run.mutate(undefined, {
                    onSuccess: (res) => {
                      setDone(res);
                      setConfirming(false);
                    },
                  })
                }
              >
                {run.isPending ? 'Generating…' : `Confirm & generate ${p.created}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {done && (
        <div className="mt-4 rounded-xl bg-paper p-4 text-sm">
          <p className="font-600 text-good">Done — {done.period} billed.</p>
          <p className="mt-1 text-ink/70">
            Created {done.created} invoice{done.created === 1 ? '' : 's'} totalling {peso(done.totalCents)}.
            {typeof done.overdueMarked === 'number' && done.overdueMarked > 0 &&
              ` Flagged ${done.overdueMarked} past-due invoice${done.overdueMarked === 1 ? '' : 's'} as overdue.`}
          </p>
          <button className="btn-ghost mt-3" onClick={() => setDone(null)}>Close</button>
        </div>
      )}

      {(preview.isError || run.isError) && (
        <p className="mt-3 text-sm text-bad">Something went wrong. Please try again.</p>
      )}
    </div>
  );
}
