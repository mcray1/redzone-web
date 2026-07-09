import { useState } from 'react';
import { useExpenses, usePnl, useSaveExpense, useVoidExpense } from '../../hooks/queries';
import { peso, type Expense } from '../../api/types';
import { toCsv, downloadCsv, todayStamp, type CsvColumn } from '../../lib/csv';
import { Spinner } from '../../components/ui';
import { FileUpload } from '../../components/FileUpload';
import { ProofLink } from '../../components/ProofLink';

const CATEGORIES = [
  'ISP / bandwidth', 'Equipment', 'Salary', 'Fuel / transport', 'Tower / site rental',
  'Electricity', 'Office supplies', 'Repairs', 'Marketing', 'Miscellaneous',
];
const METHODS = ['CASH', 'GCASH', 'MAYA', 'BANK'];
const pesoNum = (cents: number) => (cents / 100).toFixed(2);

function monthStartStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function Expenses() {
  const [from, setFrom] = useState(monthStartStamp());
  const [to, setTo] = useState(todayStamp());
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [adding, setAdding] = useState(false);

  const { data: pnl } = usePnl(from, to);
  const { data, isLoading } = useExpenses({ from, to, category: category || undefined });
  const voidExpense = useVoidExpense();

  function exportCsv() {
    if (!data) return;
    const cols: CsvColumn[] = [
      { key: 'date', label: 'Date' }, { key: 'category', label: 'Category' },
      { key: 'description', label: 'Description' }, { key: 'vendor', label: 'Vendor' },
      { key: 'method', label: 'Method' }, { key: 'reference', label: 'Reference' },
      { key: 'amount', label: 'Amount' },
    ];
    const rows = data.rows.map((e) => ({
      date: new Date(e.date).toLocaleDateString('en-PH'),
      category: e.category, description: e.description, vendor: e.vendor || '',
      method: e.method || '', reference: e.reference || '', amount: pesoNum(e.amountCents),
    }));
    downloadCsv(`expenses_${from}_to_${to}.csv`, toCsv(rows, cols));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-700">Expenses</h1>
          <p className="text-sm text-ink/50">Track spending and see profit for a period.</p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => setAdding(true)}>Add expense</button>
      </div>

      {/* Profit / loss */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card px-4 py-3">
          <p className="text-xs font-600 uppercase tracking-wide text-ink/50">Income</p>
          <p className="mt-1 font-display text-lg font-700 text-good">{peso(pnl?.incomeCents ?? 0)}</p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-xs font-600 uppercase tracking-wide text-ink/50">Expenses</p>
          <p className="mt-1 font-display text-lg font-700 text-bad">{peso(pnl?.expenseCents ?? 0)}</p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-xs font-600 uppercase tracking-wide text-ink/50">Net</p>
          <p className={`mt-1 font-display text-lg font-700 ${(pnl?.netCents ?? 0) < 0 ? 'text-bad' : 'text-ink'}`}>{peso(pnl?.netCents ?? 0)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label">From</label>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button className="btn-ghost" onClick={exportCsv} disabled={!data || data.count === 0}>Download CSV</button>
        </div>

        {data && Object.keys(data.byCategory).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink/50">
            {Object.entries(data.byCategory).map(([c, cents]) => <span key={c}>{c}: {peso(cents)}</span>)}
          </div>
        )}
      </div>

      {/* List */}
      <div className="card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display font-600">Expenses</h2>
          {data && <span className="text-sm text-ink/50">{peso(data.totalCents)} · {data.count}</span>}
        </div>
        {isLoading ? (
          <div className="mt-4"><Spinner /></div>
        ) : !data || data.rows.length === 0 ? (
          <p className="mt-3 text-sm text-ink/40">No expenses in this period.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {data.rows.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-600">{e.description}</p>
                  <p className="text-xs text-ink/50">
                    {new Date(e.date).toLocaleDateString('en-PH')} · {e.category}
                    {e.vendor ? ` · ${e.vendor}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {e.receiptPath && <ProofLink path={e.receiptPath} label="Receipt" />}
                  <span className="font-600 text-bad">{peso(e.amountCents)}</span>
                  <button className="text-xs font-600 text-ink/50" onClick={() => setEditing(e)}>Edit</button>
                  <button className="text-xs font-600 text-bad"
                    onClick={() => { if (window.confirm('Void this expense?')) voidExpense.mutate(e.id); }}>
                    Void
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(adding || editing) && (
        <ExpenseModal expense={editing} onClose={() => { setAdding(false); setEditing(null); }} />
      )}
    </div>
  );
}

function ExpenseModal({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  const save = useSaveExpense();
  const [date, setDate] = useState(expense ? expense.date.slice(0, 10) : todayStamp());
  const [category, setCategory] = useState(expense?.category ?? CATEGORIES[0]);
  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(expense ? String(expense.amountCents / 100) : '');
  const [method, setMethod] = useState(expense?.method ?? '');
  const [vendor, setVendor] = useState(expense?.vendor ?? '');
  const [reference, setReference] = useState(expense?.reference ?? '');
  const [receiptPath, setReceiptPath] = useState<string | null>(expense?.receiptPath ?? null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    const cents = Math.round(Number(amount || 0) * 100);
    if (cents <= 0) { setErr('Enter an amount.'); return; }
    if (!description.trim()) { setErr('Enter a description.'); return; }
    try {
      await save.mutateAsync({
        id: expense?.id,
        date, category, description: description.trim(), amountCents: cents,
        method: method || undefined, vendor: vendor || undefined, reference: reference || undefined,
        receiptPath: receiptPath || undefined,
      });
      onClose();
    } catch {
      setErr('Could not save the expense.');
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">{expense ? 'Edit expense' : 'Add expense'}</h2>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Amount (₱)</label>
              <input className="input" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Method</label>
              <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="">—</option>
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Vendor</label>
              <input className="input" value={vendor} onChange={(e) => setVendor(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Reference / receipt no. (optional)</label>
            <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div>
            <label className="label">Receipt photo (optional)</label>
            <div className="flex items-center gap-3">
              <FileUpload kind="expense-receipt" label="Attach receipt" onUploaded={setReceiptPath} />
              {receiptPath && <ProofLink path={receiptPath} label="View" />}
            </div>
          </div>
          {err && <p className="text-sm text-bad">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" disabled={save.isPending} onClick={submit}>
              {save.isPending ? 'Saving…' : 'Save expense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
