import { useState } from 'react';
import { useCollectionsReport, useOutstandingReport, fetchSubscriberReport } from '../../hooks/queries';
import { peso } from '../../api/types';
import { toCsv, downloadCsv, todayStamp, type CsvColumn } from '../../lib/csv';
import { Spinner } from '../../components/ui';

const pesoNum = (cents: number) => (cents / 100).toFixed(2);

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-700">Reports</h1>
        <p className="text-sm text-ink/50">View on screen or download as CSV (opens in Excel).</p>
      </div>
      <CollectionsCard />
      <OutstandingCard />
      <SubscriberExportCard />
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
