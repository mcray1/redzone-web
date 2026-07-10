import { useAppSettings, useUpdateAppSettings } from '../../hooks/queries';
import { Spinner } from '../../components/ui';

export default function Settings() {
  const { data, isLoading } = useAppSettings();
  const update = useUpdateAppSettings();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-700">Settings</h1>
        <p className="text-sm text-ink/50">Owner/admin controls.</p>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-600">Discount requests</h2>
        <p className="mt-1 text-sm text-ink/50">Turn the "Request discount" button on or off for each side. Requests still need owner/admin approval.</p>
        {isLoading || !data ? (
          <div className="mt-4"><Spinner /></div>
        ) : (
          <div className="mt-4 space-y-3">
            <Toggle
              label="Collectors & staff can request"
              hint="Shows the Request discount button on the subscriber page."
              on={data.discountByCollector}
              busy={update.isPending}
              onChange={(v) => update.mutate({ discountByCollector: v })}
            />
            <Toggle
              label="Customers can request in the portal"
              hint="Shows a Request a discount box in the customer portal."
              on={data.discountByCustomer}
              busy={update.isPending}
              onChange={(v) => update.mutate({ discountByCustomer: v })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, hint, on, busy, onChange }:
  { label: string; hint: string; on: boolean; busy: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
      <div className="min-w-0">
        <p className="font-600">{label}</p>
        <p className="text-xs text-ink/50">{hint}</p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => onChange(!on)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-signal-600' : 'bg-line'}`}
        aria-pressed={on}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
