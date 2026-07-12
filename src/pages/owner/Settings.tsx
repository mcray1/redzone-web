import { useEffect, useState } from 'react';
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
            <MaxDiscount current={data.maxDiscountCents} busy={update.isPending} onSave={(cents) => update.mutate({ maxDiscountCents: cents })} />
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-display font-600">Network enforcement (MikroTik)</h2>
        <p className="mt-1 text-sm text-ink/50">
          The master switch for actually cutting and reconnecting customers on the router.
        </p>
        {isLoading || !data ? (
          <div className="mt-4"><Spinner /></div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className={`rounded-xl border p-3 text-sm ${data.mikrotikEnforcement ? 'border-bad/40 bg-bad/5 text-bad' : 'border-line bg-paper text-ink/60'}`}>
              {data.mikrotikEnforcement
                ? 'ON — Suspend actually disconnects a customer’s internet, and payment/Restore reconnects them.'
                : 'OFF — Suspend and Restore only change the label in the app. Nothing is sent to any router. (Safe while you set up and test.)'}
            </div>
            <Toggle
              label="Enable network enforcement"
              hint="Leave OFF until your router report+control script is installed and you’ve tested on one subscriber."
              on={data.mikrotikEnforcement}
              busy={update.isPending}
              onChange={(v) => {
                if (v && !window.confirm(
                  'Turn ON network enforcement?\n\n' +
                  'From now on, Suspend will REALLY disconnect a customer’s internet, and payment/Restore will reconnect them. ' +
                  'Make sure the router script is installed and you’ve tested on one subscriber first.',
                )) return;
                update.mutate({ mikrotikEnforcement: v });
              }}
            />
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-display font-600">Customer portal</h2>
        <p className="mt-1 text-sm text-ink/50">What subscribers can see and do in their own portal.</p>
        {isLoading || !data ? (
          <div className="mt-4"><Spinner /></div>
        ) : (
          <div className="mt-4">
            <Toggle
              label="Show WiFi name & password"
              hint="Lets customers view the WiFi credentials you recorded for them."
              on={data.showWifiInPortal}
              busy={update.isPending}
              onChange={(v) => update.mutate({ showWifiInPortal: v })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MaxDiscount({ current, busy, onSave }: { current: number; busy: boolean; onSave: (cents: number) => void }) {
  const [val, setVal] = useState('');
  useEffect(() => { setVal(current > 0 ? String(current / 100) : ''); }, [current]);
  const cents = Math.round(Number(val || 0) * 100);
  const dirty = cents !== current;
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="font-600">Maximum discount per request</p>
      <p className="text-xs text-ink/50">The most anyone can ask for in one request. Leave blank (or 0) for no limit.</p>
      <div className="mt-2 flex gap-2">
        <input className="input" inputMode="decimal" placeholder="No limit"
          value={val} onChange={(e) => setVal(e.target.value.replace(/[^0-9.]/g, ''))} />
        <button className="btn-primary shrink-0" disabled={busy || !dirty} onClick={() => onSave(cents)}>Save</button>
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
