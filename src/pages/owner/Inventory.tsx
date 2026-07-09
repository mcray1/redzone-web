import { useState, type ReactNode } from 'react';
import { useInventory, useSaveItem, useAdjustStock, useItemMovements } from '../../hooks/queries';
import { useAuth } from '../../context/AuthContext';
import type { InventoryItem, MovementType } from '../../api/types';
import { Spinner, EmptyState } from '../../components/ui';

const CATEGORIES = ['CPE', 'ONU', 'Router', 'Cable', 'Connector', 'Power adapter', 'Mounting', 'Tools', 'Parts', 'Other'];
const MOVES: { type: MovementType; label: string; adds: boolean }[] = [
  { type: 'STOCK_IN', label: 'Stock in', adds: true },
  { type: 'RETURNED', label: 'Returned', adds: true },
  { type: 'STOCK_OUT', label: 'Stock out', adds: false },
  { type: 'USED', label: 'Used on a job', adds: false },
  { type: 'ASSIGNED', label: 'Assigned to tech', adds: false },
  { type: 'DAMAGED', label: 'Damaged', adds: false },
];
const MOVE_LABEL: Record<MovementType, string> = {
  STOCK_IN: 'Stock in', RETURNED: 'Returned', STOCK_OUT: 'Stock out',
  DAMAGED: 'Damaged', ASSIGNED: 'Assigned', USED: 'Used',
};
const ADD_TYPES = new Set<MovementType>(['STOCK_IN', 'RETURNED']);

export default function Inventory() {
  const { hasPerm } = useAuth();
  const canManage = hasPerm('inventory.manage');
  const { data, isLoading } = useInventory();
  const [editing, setEditing] = useState<InventoryItem | 'new' | null>(null);
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-700">Inventory</h1>
          <p className="text-sm text-ink/50">Equipment and materials on hand.</p>
        </div>
        {canManage && <button className="btn-primary shrink-0" onClick={() => setEditing('new')}>Add item</button>}
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No items yet" hint="Add your first equipment or material to start tracking stock." />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {data.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
              {canManage ? (
                <button className="min-w-0 text-left" onClick={() => setEditing(i)}>
                  <p className="truncate font-600">{i.name}</p>
                  <p className="text-xs text-ink/50">{i.category}{i.sku ? ` · ${i.sku}` : ''}</p>
                </button>
              ) : (
                <div className="min-w-0">
                  <p className="truncate font-600">{i.name}</p>
                  <p className="text-xs text-ink/50">{i.category}{i.sku ? ` · ${i.sku}` : ''}</p>
                </div>
              )}
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <p className={`font-600 ${i.lowStock ? 'text-bad' : ''}`}>{i.quantityOnHand} {i.unit}</p>
                  {i.lowStock && <p className="text-xs text-bad">low stock</p>}
                </div>
                {canManage && <button className="btn-ghost" onClick={() => setAdjusting(i)}>Adjust</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <ItemModal item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {adjusting && <AdjustModal item={adjusting} onClose={() => setAdjusting(null)} />}
    </div>
  );
}

function ItemModal({ item, onClose }: { item: InventoryItem | null; onClose: () => void }) {
  const save = useSaveItem();
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState(item?.category ?? CATEGORIES[0]);
  const [unit, setUnit] = useState(item?.unit ?? 'pc');
  const [sku, setSku] = useState(item?.sku ?? '');
  const [reorderLevel, setReorderLevel] = useState(String(item?.reorderLevel ?? 0));
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!name.trim()) { setErr('Enter a name.'); return; }
    try {
      await save.mutateAsync({
        id: item?.id, name: name.trim(), category, unit: unit || 'pc',
        sku: sku || undefined, reorderLevel: Math.round(Number(reorderLevel || 0)),
      });
      onClose();
    } catch {
      setErr('Could not save the item.');
    }
  }

  return (
    <Modal title={item ? 'Edit item' : 'Add item'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Unit</label>
            <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pc / m / box" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">SKU (optional)</label>
            <input className="input" value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>
          <div>
            <label className="label">Low-stock alert at</label>
            <input className="input" type="number" min="0" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
          </div>
        </div>
        {err && <p className="text-sm text-bad">{err}</p>}
        <div className="flex gap-2 pt-1">
          <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" disabled={save.isPending} onClick={submit}>
            {save.isPending ? 'Saving…' : 'Save item'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AdjustModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const adjust = useAdjustStock();
  const { data: history } = useItemMovements(item.id);
  const [type, setType] = useState<MovementType>('STOCK_IN');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    const q = Math.round(Number(quantity || 0));
    if (q <= 0) { setErr('Enter a quantity.'); return; }
    try {
      await adjust.mutateAsync({ id: item.id, type, quantity: q, note: note || undefined });
      setQuantity('');
      setNote('');
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErr(m || 'Could not record the movement.');
    }
  }

  return (
    <Modal title={item.name} onClose={onClose}>
      <p className="text-sm text-ink/50">On hand: <b>{item.quantityOnHand} {item.unit}</b></p>
      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={type} onChange={(e) => setType(e.target.value as MovementType)}>
            {MOVES.map((m) => <option key={m.type} value={m.type}>{m.label}</option>)}
          </select>
          <input className="input" type="number" min="1" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
        <input className="input" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        {err && <p className="text-sm text-bad">{err}</p>}
        <button className="btn-primary w-full" disabled={adjust.isPending} onClick={submit}>
          {adjust.isPending ? 'Saving…' : 'Record movement'}
        </button>
      </div>

      {history && history.length > 0 && (
        <ul className="mt-4 max-h-52 divide-y divide-line overflow-y-auto">
          {history.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2 text-sm">
              <span>{MOVE_LABEL[m.type]}{m.note ? ` · ${m.note}` : ''}</span>
              <span className={`font-600 ${ADD_TYPES.has(m.type) ? 'text-good' : 'text-bad'}`}>
                {ADD_TYPES.has(m.type) ? '+' : '−'}{m.quantity}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
