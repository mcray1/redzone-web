import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useVendoSite, useUpdateVendoSite } from '../../hooks/queries';
import { useAuth } from '../../context/AuthContext';
import type { VendoSite } from '../../api/types';
import { Spinner } from '../../components/ui';
import { LocationSelect } from '../../components/LocationSelect';
import { VendoPanel } from '../../components/VendoPanel';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ error?: string }>;
  return e?.response?.data?.error || fallback;
}

// A vendo site's page: identity, location, and the income/expense panel.
// Sites are their own records (not subscribers) — nothing here touches
// plans, billing, or network config.
export default function VendoSiteDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: s, isLoading } = useVendoSite(id);
  const { user } = useAuth();
  const canStructure = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading || !s) return <Spinner />;

  return (
    <div className="space-y-5">
      <button onClick={() => nav(-1)} className="text-sm font-600 text-ink/50">← Back</button>

      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl font-700">
              {s.vendoNumber && <span className="mr-1 text-signal-600">#{s.vendoNumber}</span>}
              {s.vendoName}
            </h1>
            <p className="text-sm text-ink/50">{s.accountNo}</p>
          </div>
          <div className="flex items-center gap-3">
            {canStructure && (
              <button className="text-sm font-600 text-signal-600" onClick={() => setEditOpen(true)}>Edit</button>
            )}
            <span className="pill bg-signal/15 text-signal-600">Vendo</span>
            <span className={`pill ${s.status === 'ACTIVE' ? 'bg-good/10 text-good' : 'bg-ink/10 text-ink/50'}`}>
              {s.status === 'ACTIVE' ? 'Active' : 'Archived'}
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <Field label="Host / partner" value={s.partnerName} />
          <Field label="Phone" value={s.phone ?? '—'} />
          <Field label="Sitio / Purok" value={s.sitio ?? '—'} />
          <Field label="Barangay" value={s.barangay ?? '—'} />
          <Field label="Municipality" value={s.municipality ?? '—'} />
          <Field label="Est. clients" value={s.estimatedClients != null ? String(s.estimatedClients) : '—'} />
          {s.address && <Field label="Address" value={s.address} />}
          {s.notes && <Field label="Notes" value={s.notes} />}
        </div>
      </div>

      <VendoPanel siteId={s.id} />

      {editOpen && <EditSiteModal site={s} onClose={() => setEditOpen(false)} />}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-600 uppercase tracking-wide text-ink/40">{label}</p>
      <p className="mt-0.5 font-500">{value}</p>
    </div>
  );
}

function EditSiteModal({ site, onClose }: { site: VendoSite; onClose: () => void }) {
  const update = useUpdateVendoSite();
  const [vendoName, setVendoName] = useState(site.vendoName);
  const [vendoNumber, setVendoNumber] = useState(site.vendoNumber ?? '');
  const [ownerName, setOwnerName] = useState(site.partnerName);
  const [phone, setPhone] = useState(site.phone ?? '');
  const [municipality, setMunicipality] = useState(site.municipality ?? '');
  const [barangay, setBarangay] = useState(site.barangay ?? '');
  const [sitio, setSitio] = useState(site.sitio ?? '');
  const [estimatedClients, setEstimatedClients] = useState(site.estimatedClients != null ? String(site.estimatedClients) : '');
  const [notes, setNotes] = useState(site.notes ?? '');
  const [status, setStatus] = useState<VendoSite['status']>(site.status);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!vendoName.trim()) { setErr('Give the site a name.'); return; }
    try {
      await update.mutateAsync({
        id: site.id,
        vendoName: vendoName.trim(),
        vendoNumber: vendoNumber.trim(),
        ownerName: ownerName.trim() || vendoName.trim(),
        phone: phone.trim(),
        municipality,
        barangay,
        sitio: sitio.trim(),
        estimatedClients: estimatedClients !== '' ? Number(estimatedClients) : undefined,
        notes: notes.trim(),
        status,
      });
      onClose();
    } catch (e) { setErr(apiError(e, 'Could not save the changes.')); }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-700">Edit vendo site</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Site / machine name</label>
            <input className="input" value={vendoName} onChange={(e) => setVendoName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Machine # / VLAN</label>
              <input className="input" value={vendoNumber} onChange={(e) => setVendoNumber(e.target.value)} />
            </div>
            <div>
              <label className="label">Host / partner</label>
              <input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Phone</label>
              <input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="label">Est. clients</label>
              <input className="input" inputMode="numeric" value={estimatedClients} onChange={(e) => setEstimatedClients(e.target.value.replace(/[^0-9]/g, ''))} />
            </div>
          </div>
          <div>
            <label className="label">Sitio / Purok</label>
            <input className="input" value={sitio} onChange={(e) => setSitio(e.target.value)} />
          </div>
          <LocationSelect municipality={municipality} barangay={barangay}
            onMunicipality={setMunicipality} onBarangay={setBarangay} />
          <div>
            <label className="label">Notes</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={status === 'ARCHIVED'}
              onChange={(e) => setStatus(e.target.checked ? 'ARCHIVED' : 'ACTIVE')} />
            Archived — machine no longer operating (hidden from pickers)
          </label>
          {err && <p className="text-sm text-bad">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" onClick={submit} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
