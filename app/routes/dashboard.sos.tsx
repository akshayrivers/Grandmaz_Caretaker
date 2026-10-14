import { useCallback, useEffect, useState } from "react";
import { api, describeError } from "~/lib/api";
import type { SosEvent } from "~/lib/types";
import { canSendCommands } from "~/lib/types";
import { useMyDevices } from "~/lib/use-devices";
import { ErrorBanner } from "~/components/error-banner";
import { LoadingSpinner } from "~/components/loading-spinner";

export default function SosPage() {
  const { devices, loading: devicesLoading, error: devicesError } = useMyDevices();
  const [deviceId, setDeviceId] = useState("");
  const [events, setEvents] = useState<SosEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceId && devices[0]) setDeviceId(devices[0].deviceId);
  }, [devices, deviceId]);

  const selected = devices.find((device) => device.deviceId === deviceId);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      setEvents(await api.getDeviceSos(id));
    } catch (err) {
      setError(describeError(err, "Couldn't load SOS alerts."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    void load(deviceId);
    const timer = window.setInterval(() => void load(deviceId), 15_000);
    return () => window.clearInterval(timer);
  }, [deviceId, load]);

  const ack = async (id: string) => {
    try {
      await api.acknowledgeSos(id);
      if (deviceId) await load(deviceId);
    } catch (err) {
      setError(describeError(err, "Couldn't acknowledge that alert."));
    }
  };

  if (devicesLoading) return <LoadingSpinner message="Loading devices..." />;

  const active = events.filter((event) => event.status === "active");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SOS</h1>
        <p className="text-sm text-gray-500">Acknowledging stops the alert. It does not hang up grandma's call.</p>
      </div>
      {devicesError && <ErrorBanner message={devicesError} />}
      {error && <ErrorBanner message={error} />}
      <label className="block text-sm font-medium">
        Phone
        <select className="mt-1 w-full rounded-md border px-3 py-2" value={deviceId} onChange={(event) => setDeviceId(event.target.value)}>
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>{device.displayName || device.deviceId}</option>
          ))}
        </select>
      </label>
      {loading && events.length === 0 ? <LoadingSpinner message="Checking for alerts..." /> : null}
      {active.length === 0 && !loading ? <p className="text-sm text-gray-500">No active SOS.</p> : null}
      {events.map((event) => {
        const map = event.latitude != null && event.longitude != null
          ? `https://maps.google.com/?q=${event.latitude},${event.longitude}`
          : null;
        return (
          <article key={event.id} className={`rounded-lg border p-4 ${event.status === "active" ? "border-red-700 bg-red-50" : "border-gray-200"}`}>
            <p className="font-semibold capitalize">{event.status}</p>
            <p className="text-sm text-gray-600">{new Date(event.createdAt).toLocaleString()}</p>
            {map ? <a className="text-sm text-blue-700 underline" href={map} target="_blank" rel="noreferrer">Open location</a> : <p className="text-sm">No location yet.</p>}
            {event.status === "active" && canSendCommands(selected?.role) && (
              <button type="button" className="mt-3 rounded-md bg-gray-900 px-3 py-2 text-sm text-white" onClick={() => void ack(event.id)}>
                I have this
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
