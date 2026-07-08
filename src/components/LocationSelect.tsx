import { MUNICIPALITY_NAMES, barangaysFor } from '../lib/iloilo-locations';

/**
 * Municipality → Barangay cascading select.
 * Controlled component: parent owns the values.
 */
export function LocationSelect({
  municipality,
  barangay,
  onMunicipality,
  onBarangay,
}: {
  municipality: string;
  barangay: string;
  onMunicipality: (v: string) => void;
  onBarangay: (v: string) => void;
}) {
  const barangays = barangaysFor(municipality);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="label">Municipality</label>
        <select
          className="input"
          value={municipality}
          onChange={(e) => { onMunicipality(e.target.value); onBarangay(''); }}
        >
          <option value="">— Select —</option>
          {MUNICIPALITY_NAMES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Barangay</label>
        <select
          className="input"
          value={barangay}
          onChange={(e) => onBarangay(e.target.value)}
          disabled={!municipality}
        >
          <option value="">{municipality ? '— Select —' : 'Pick municipality first'}</option>
          {barangays.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
