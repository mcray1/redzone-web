import { useState } from 'react';
import { useCollectionsReport, useOutstandingReport, useAgingReport, useCollectorReport, fetchSubscriberReport } from '../../hooks/queries';
import { peso } from '../../api/types';
import { toCsv, downloadCsv, todayStamp, type CsvColumn } from '../../lib/csv';
import { Spinner } from '../../components/ui';

const pesoNum = (cents: number) => (cents / 100).toFixed(2);
function monthStartStamp() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-700">Reports</h1>
        <p className="text-sm text-ink/50">View on screen or download as CSV (opens in Excel).</p>
      </div>
      <CollectionsCard />
      <CollectorsCard />
      <AgingCard />
      <OutstandingCard />
      <SubscriberExportCard />
    </div>
  );
}

function CollectorsCard() {
  const [from, setFrom] = useState(monthStartStamp());
  const [to, setTo] = useState(todayStamp());
  const { data, isLoading } = useCollectorReport(from, to);

  return (
    <div className="card p-5">
      <h2 className="font-display font-600">Collector performance</h2>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div><label className="label">From</label><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="label">To</label><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      {isLoading ? <div className="mt-4"><Spinner /></div> : data && (
        <>
          <div className="mt-4 font-display text-xl font-700">{peso(data.totalCents)} <span className="text-sm font-400 text-ink/50">collected</span></div>
          <div className="mt-3 max-h-72 overflow-y-auto">
            {data.rows.length === 0 ? <p className="text-sm text-ink/40">No collections in this range.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-ink/40"><th className="py-1">Collector</th><th className="text-right">Payments</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.collectorId ?? 'office'} className="border-t border-line">
                      <td className="py-1.5 font-600">{r.name}</td>
                      <td className="text-right text-ink/50">{r.count}</td>
                      <td className="text-right font-600">{peso(r.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AgingCard() {
  const { data, isLoading } = useAgingReport();

  function exportCsv() {
    if (!data) return;
    const cols: CsvColumn[] = [
      { key: 'accountNo', label: 'Account' }, { key: 'subscriber', label: 'Subscriber' },
      { key: 'phone', label: 'Phone' }, { key: 'barangay', label: 'Barangay' },
      { key: 'daysOverdue', label: 'Days overdue' }, { key: 'bucket', label: 'Bucket' },
      { key: 'balance', label: 'Balance' },
    ];
    const rows = data.rows.map((r) => ({ ...r, balance: pesoNum(r.balanceCents) }));
    downloadCsv(`aging_${todayStamp()}.csv`, toCsv(rows, cols));
  }

  const b = data?.buckets;
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display font-600">Receivables aging</h2>
        <button className="btn-ghost shrink-0" onClick={exportCsv} disabled={!data || data.count === 0}>Download CSV</button>
      </div>
      {isLoading ? <div className="mt-4"><Spinner /></div> : b && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Bucket label="Current" cents={b.current} />
            <Bucket label="1–30 days" cents={b.d1_30} tone="warn" />
            <Bucket label="31–60 days" cents={b.d31_60} tone="warn" />
            <Bucket label="60+ days" cents={b.d60plus} tone="bad" />
          </div>
          <div className="mt-3 max-h-72 overflow-y-auto">
            {data.rows.length === 0 ? <p className="text-sm text-ink/40">No receivables.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-ink/40"><th className="py-1">Account</th><th>Subscriber</th><th className="text-right">Overdue</th><th className="text-right">Balance</th></tr></thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id} className="border-t border-line">
                      <td className="py-1.5 font-mono text-xs">{r.accountNo}</td>
                      <td className="pr-2">{r.subscriber}</td>
                      <td className={`text-right ${r.daysOverdue > 60 ? 'text-bad' : r.daysOverdue > 0 ? 'text-warn' : 'text-ink/40'}`}>{r.daysOverdue > 0 ? `${r.daysOverdue}d` : 'current'}</td>
                      <td className="text-right font-600">{peso(r.balanceCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Bucket({ label, cents, tone }: { label: string; cents: number; tone?: 'warn' | 'bad' }) {
  const color = tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-ink';
  return (
    <div className="rounded-xl bg-paper px-3 py-2">
      <p className="text-[11px] font-600 uppercase tracking-wide text-ink/40">{label}</p>
      <p className={`mt-0.5 font-display text-lg font-700 ${color}`}>{peso(cents)}</p>
    </div>
  );
}

function CollectionsCard() {
  const [from, setFrom] = useState(todayStamp());
  const [to, setTo] = useState(todayStamp());
  const { data, isLoading } = useCollectionsReport(from, to);

  function exportCsv() {
    if (!data) return;
    const cols: CsvColumn[] = [
      { key: 'receiptNo', label: 'Receipt' }, { key: 'date', label: 'Date' },
      { key: 'accountNo', label: 'Account' }, { key: 'subscriber', label: 'Subscriber' },
      { key: 'municipality', label: 'Municipality' }, { key: 'barangay', label: 'Barangay' },
      { key: 'method', label: 'Method' }, { key: 'reference', label: 'Reference' },
      { key: 'collector', label: 'Collector' }, { key: 'amount', label: 'Amount' },
    ];
    const rows = data.rows.map((r) => ({ ...r, date: new Date(r.date).toLocaleString('en-PH'), amount: pesoNum(r.amountCents) }));
    downloadCsv(`collections_${from}_to_${to}.csv`, toCsv(rows, cols));
  }

  return (
    <div className="card p-5">
      <h2 className="font-display font-600">Collections</h2>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="label">From</label>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn-ghost" onClick={exportCsv} disabled={!data || data.count === 0}>Download CSV</button>
      </div>

      {isLoading ? (
        <div className="mt-4"><Spinner /></div>
      ) : data && (
        <>
          <div className="mt-4 flex flex-wrap items-baseline gap-4">
            <span className="font-display text-xl font-700">{peso(data.totalCents)}</span>
            <span className="text-sm text-ink/50">{data.count} payment{data.count === 1 ? '' : 's'}</span>
          </div>
          {Object.keys(data.byMethod).length > 0 && (
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-ink/50">
              {Object.entries(data.byMethod).map(([m, c]) => <span key={m}>{m}: {peso(c)}</span>)}
            </div>
          )}
          <div className="mt-3 max-h-72 overflow-y-auto">
            {data.rows.length === 0 ? (
              <p className="text-sm text-ink/40">No collections in this range.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink/40">
                    <th className="py-1">Date</th><th>Subscriber</th><th>Method</th><th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.receiptNo} className="border-t border-line">
                      <td className="py-1.5">{new Date(r.date).toLocaleDateString('en-PH')}</td>
                      <td className="pr-2">{r.subscriber}</td>
                      <td>{r.method}</td>
                      <td className="text-right font-600">{peso(r.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function OutstandingCard() {
  const { data, isLoading } = useOutstandingReport();

  function exportCsv() {
    if (!data) return;
    const cols: CsvColumn[] = [
      { key: 'accountNo', label: 'Account' }, { key: 'subscriber', label: 'Subscriber' },
      { key: 'phone', label: 'Phone' }, { key: 'plan', label: 'Plan' },
      { key: 'municipality', label: 'Municipality' }, { key: 'barangay', label: 'Barangay' },
      { key: 'status', label: 'Status' }, { key: 'dueDay', label: 'Due day' },
      { key: 'balance', label: 'Balance' },
    ];
    const rows = data.rows.map((r) => ({ ...r, balance: pesoNum(r.balanceCents) }));
    downloadCsv(`outstanding_${todayStamp()}.csv`, toCsv(rows, cols));
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display font-600">Outstanding balances</h2>
        <button className="btn-ghost shrink-0" onClick={exportCsv} disabled={!data || data.count === 0}>Download CSV</button>
      </div>
      {isLoading ? (
        <div className="mt-4"><Spinner /></div>
      ) : data && (
        <>
          <div className="mt-3 flex flex-wrap items-baseline gap-4">
            <span className="font-display text-xl font-700 text-bad">{peso(data.totalCents)}</span>
            <span className="text-sm text-ink/50">{data.count} account{data.count === 1 ? '' : 's'} owing</span>
          </div>
          <div className="mt-3 max-h-72 overflow-y-auto">
            {data.rows.length === 0 ? (
              <p className="text-sm text-ink/40">No outstanding balances.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink/40">
                    <th className="py-1">Account</th><th>Subscriber</th><th>Barangay</th><th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.accountNo} className="border-t border-line">
                      <td className="py-1.5 font-mono text-xs">{r.accountNo}</td>
                      <td className="pr-2">{r.subscriber}</td>
                      <td className="text-ink/50">{r.barangay}</td>
                      <td className="text-right font-600 text-bad">{peso(r.balanceCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SubscriberExportCard() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setErr(null);
    setBusy(true);
    try {
      const rows = await fetchSubscriberReport();
      const cols: CsvColumn[] = [
        { key: 'accountNo', label: 'Account' }, { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' },
        { key: 'status', label: 'Status' }, { key: 'plan', label: 'Plan' },
        { key: 'monthly', label: 'Monthly' }, { key: 'dueDay', label: 'Due day' },
        { key: 'balance', label: 'Balance' }, { key: 'sitio', label: 'Sitio' },
        { key: 'barangay', label: 'Barangay' }, { key: 'municipality', label: 'Municipality' },
        { key: 'address', label: 'Address' },
      ];
      const mapped = rows.map((r) => ({ ...r, monthly: pesoNum(r.monthlyCents), balance: pesoNum(r.balanceCents) }));
      downloadCsv(`subscribers_${todayStamp()}.csv`, toCsv(mapped, cols));
    } catch {
      setErr('Could not prepare the export.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex items-center justify-between gap-3 p-5">
      <div>
        <h2 className="font-display font-600">Subscriber master list</h2>
        <p className="text-sm text-ink/50">Everyone, with plan, balance, and location.</p>
        {err && <p className="mt-1 text-sm text-bad">{err}</p>}
      </div>
      <button className="btn-primary shrink-0" onClick={go} disabled={busy}>
        {busy ? 'Preparing…' : 'Download CSV'}
      </button>
    </div>
  );
}
