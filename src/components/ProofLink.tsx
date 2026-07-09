import { useState } from 'react';
import { api } from '../api/client';

/** Opens a stored private file via a short-lived signed URL, in a new tab. */
export function ProofLink({ path, label = 'View' }: { path: string; label?: string }) {
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const { data } = await api.get<{ url: string }>('/files/signed-url', { params: { path } });
      window.open(data.url, '_blank', 'noopener');
    } catch {
      /* ignore — link just won't open */
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" className="text-xs font-600 text-signal-600" onClick={open} disabled={loading}>
      {loading ? '…' : label}
    </button>
  );
}
