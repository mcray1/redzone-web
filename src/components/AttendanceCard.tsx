import { useState } from 'react';
import { useAttendanceToday, useCheckIn, useCheckOut } from '../hooks/queries';
import { Spinner } from './ui';

// Reads the device's location via the browser Geolocation API, then records
// a GPS-stamped time-in. Location permission is requested at tap time.
function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This device does not support location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

export function AttendanceCard() {
  const { data, isLoading } = useAttendanceToday();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [status, setStatus] = useState<string | null>(null);

  async function doCheckIn() {
    setStatus('Getting your location…');
    try {
      const pos = await getPosition();
      await checkIn.mutateAsync({
        gpsLat: pos.coords.latitude,
        gpsLng: pos.coords.longitude,
        accuracyM: pos.coords.accuracy,
      });
      setStatus(null);
    } catch (err: unknown) {
      // If location is denied, still allow check-in without GPS but flag it.
      const denied = (err as GeolocationPositionError)?.code === 1;
      setStatus(denied ? 'Location was blocked — checking in without it.' : 'Could not get location — checking in without it.');
      try {
        await checkIn.mutateAsync({ note: 'No GPS (permission denied or unavailable)' });
        setStatus(null);
      } catch {
        setStatus('Check-in failed. Try again.');
      }
    }
  }

  if (isLoading) return <div className="card p-5"><Spinner /></div>;

  const firstIn = data?.records?.[data.records.length - 1];
  const hasGps = firstIn?.gpsLat != null && firstIn?.gpsLng != null;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-600 uppercase tracking-wide text-ink/40">Attendance</p>
          {data?.checkedIn ? (
            <p className="mt-1 font-display text-lg font-700 text-good">Checked in</p>
          ) : firstIn ? (
            <p className="mt-1 font-display text-lg font-700 text-ink/60">Checked out</p>
          ) : (
            <p className="mt-1 font-display text-lg font-700">Not yet checked in</p>
          )}
          {firstIn && (
            <p className="text-xs text-ink/50">
              Time in {new Date(firstIn.timeIn).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
              {hasGps ? ' · GPS recorded' : ' · no GPS'}
            </p>
          )}
        </div>
      </div>

      {status && <p className="mt-2 text-sm text-ink/60">{status}</p>}

      <div className="mt-3 flex gap-2">
        {!data?.checkedIn && (
          <button className="btn-primary flex-1" onClick={doCheckIn} disabled={checkIn.isPending}>
            {checkIn.isPending ? 'Checking in…' : 'Time in'}
          </button>
        )}
        {data?.checkedIn && (
          <button className="btn-ghost flex-1" onClick={() => checkOut.mutate()} disabled={checkOut.isPending}>
            {checkOut.isPending ? 'Saving…' : 'Time out (optional)'}
          </button>
        )}
      </div>
    </div>
  );
}
