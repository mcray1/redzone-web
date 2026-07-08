import { useState, useEffect } from 'react';
import { useStaffScope, useSetStaffMunicipalities, useSetStaffAssignments, useSubscribers } from '../../hooks/queries';
import { MUNICIPALITY_NAMES } from '../../lib/iloilo-locations';
import { Spinner } from '../../components/ui';

// Editor for one staff member's coverage: municipalities + explicit subscribers.
export function StaffScopeEditor({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data: scope, isLoading } = useStaffScope(userId);
  const setMunis = useSetStaffMunicipalities();
  const setAssigns = useSetStaffAssignments();

  const [munis, setMuniState] = useState<string[]>([]);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  // Local map of id -> display info, seeded from scope and grown as we add.
  const [subInfo, setSubInfo] = useState<Record<string, { fullName: string; accountNo: string }>>({});
  const [search, setSearch] = useState('');
  const { data: searchResults } = useSubscribers({ q: search || undefined, take: 15 });

  useEffect(() => {
    if (scope) {
      setMuniState(scope.municipalities);
      setAssignedIds(scope.subscribers.map((s) => s.id));
      const info: Record<string, { fullName: string; accountNo: string }> = {};
      scope.subscribers.forEach((s) => { info[s.id] = { fullName: s.fullName, accountNo: s.accountNo }; });
      setSubInfo(info);
    }
  }, [scope]);

  if (isLoading || !scope) return <Spinner />;

  function toggleMuni(m: string) {
    setMuniState((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  }

  const assignedSubs = assignedIds.map((id) => ({ id, ...(subInfo[id] || { fullName: id, accountNo: '' }) }));
  // Newly searched subs not already assigned
  const addable = (searchResults?.items ?? []).filter((s) => !assignedIds.includes(s.id));

  async function save() {
    await setMunis.mutateAsync({ id: userId, municipalities: munis });
    await setAssigns.mutateAsync({ id: userId, subscriberIds: assignedIds });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Coverage</h2>
        <p className="text-sm text-ink/50">Which subscribers this staff member can handle.</p>

        {/* Municipalities */}
        <div className="mt-4">
          <label className="label">Municipalities</label>
          <div className="flex flex-wrap gap-2">
            {MUNICIPALITY_NAMES.map((m) => (
              <button key={m} type="button" onClick={() => toggleMuni(m)}
                className={`pill border ${munis.includes(m) ? 'border-ink bg-ink text-white' : 'border-line text-ink/60'}`}>
                {m}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink/40">They can handle all subscribers in the selected municipalities.</p>
        </div>

        {/* Explicit subscriber assignments */}
        <div className="mt-5">
          <label className="label">Also these specific subscribers</label>
          {assignedSubs.length > 0 && (
            <ul className="mb-2 space-y-1">
              {assignedSubs.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg bg-paper px-3 py-2 text-sm">
                  <span>{s.fullName} <span className="text-ink/40">· {s.accountNo}</span></span>
                  <button type="button" className="text-bad" onClick={() => setAssignedIds((p) => p.filter((x) => x !== s.id))}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input className="input" placeholder="Search subscriber to add…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && addable.length > 0 && (
            <ul className="mt-1 divide-y divide-line rounded-lg border border-line">
              {addable.map((s) => (
                <li key={s.id}>
                  <button type="button"
                    onClick={() => {
                      setAssignedIds((p) => [...p, s.id]);
                      setSubInfo((p) => ({ ...p, [s.id]: { fullName: s.fullName, accountNo: s.accountNo } }));
                      setSearch('');
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-paper">
                    {s.fullName} <span className="text-ink/40">· {s.accountNo}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={save} disabled={setMunis.isPending || setAssigns.isPending}>
            {setMunis.isPending || setAssigns.isPending ? 'Saving…' : 'Save coverage'}
          </button>
        </div>
      </div>
    </div>
  );
}
