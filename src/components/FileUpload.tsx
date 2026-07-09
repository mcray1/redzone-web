import { useState, type ChangeEvent } from 'react';
import { api } from '../api/client';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || ''); // strip the "data:...;base64," prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Upload an image to the backend (which stores it in Supabase Storage). */
export function FileUpload({ kind, onUploaded, label = 'Attach photo' }:
  { kind: string; onUploaded: (path: string) => void; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handle(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    setDone(false);
    try {
      const dataBase64 = await fileToBase64(file);
      const { data } = await api.post<{ path: string }>('/files', {
        kind,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        dataBase64,
      });
      onUploaded(data.path);
      setDone(true);
    } catch (e2: unknown) {
      const m = (e2 as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErr(m || 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      <label className="btn-ghost inline-flex cursor-pointer text-sm">
        {busy ? 'Uploading…' : done ? '✓ Attached — replace' : label}
        <input type="file" accept="image/*" className="hidden" onChange={handle} disabled={busy} />
      </label>
      {err && <p className="mt-1 text-xs text-bad">{err}</p>}
    </div>
  );
}
