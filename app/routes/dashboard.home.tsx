import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "~/contexts/auth";
import { api } from "~/lib/api";
import { StatusBadge } from "~/components/status-badge";
import { LoadingSpinner } from "~/components/loading-spinner";
import { Monitor, Battery, Wifi, Clock } from "lucide-react";
import type { DeviceWithState } from "~/lib/types";

export default function DashboardHome() {
  const { idToken } = useAuth();
  const [devices, setDevices] = useState<DeviceWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idToken) return;
    loadDevices();
  }, [idToken]);

  async function loadDevices() {
    if (!idToken) return;
    try {
      // 1. Try fetching directly from backend
      try {
        const backendDevices = await api.getMyDevices(idToken);
        if (backendDevices && backendDevices.length > 0) {
          setDevices(backendDevices);
          // Sync to localStorage
          const toStore = backendDevices.map((d) => ({
            deviceId: d.deviceId || d.id,
            displayName: d.displayName || d.deviceId,
            role: d.caretakerRole || "primary",
          }));
          localStorage.setItem("linked_devices", JSON.stringify(toStore));
          setLoading(false);
          return;
        }
      } catch (backendErr) {
        console.warn("Could not fetch devices from backend API, trying localStorage fallback:", backendErr);
      }

      // 2. Fallback to localStorage
      const storedDevices = JSON.parse(
        localStorage.getItem("linked_devices") || "[]",
      ) as Array<{ deviceId: string; displayName: string; role: string }>;

      if (storedDevices.length === 0) {
        setDevices([]);
        setLoading(false);
        return;
      }

      const devicesWithState: DeviceWithState[] = [];

      for (const d of storedDevices) {
        try {
          const state = await api.getDeviceLatestState(idToken, d.deviceId);
          devicesWithState.push({
            id: d.deviceId,
            deviceId: d.deviceId,
            displayName: d.displayName || d.deviceId,
            isVerified: true,
            status: "active",
            lastActiveAt: state?.created_at || (state as any)?.createdAt || null,
            batteryLevel: state?.battery_level ?? (state as any)?.batteryLevel ?? null,
            batteryStatus: state?.battery_status ?? (state as any)?.batteryStatus ?? null,
            wifiSsid: state?.wifi_ssid ?? (state as any)?.wifiSsid ?? null,
            caretakerRole: d.role || "primary",
          });
        } catch {
          devicesWithState.push({
            id: d.deviceId,
            deviceId: d.deviceId,
            displayName: d.displayName || d.deviceId,
            isVerified: false,
            status: "unknown",
            lastActiveAt: null,
            batteryLevel: null,
            batteryStatus: null,
            wifiSsid: null,
            caretakerRole: d.role || "primary",
          });
        }
      }

      setDevices(devicesWithState);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner message="Loading your devices..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Devices
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Devices you're caring for
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {devices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <Monitor className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            No devices yet
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            You haven't been linked to any devices yet. Ask the device owner to
            send you an invitation.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <Link
              key={device.deviceId}
              to={`/dashboard/device/${device.deviceId}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-900 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-white"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <Monitor size={20} className="text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-gray-600 dark:text-white dark:group-hover:text-gray-300">
                      {device.displayName}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {device.caretakerRole}
                    </p>
                  </div>
                </div>
                <StatusBadge status={device.isVerified ? "active" : "inactive"} />
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {device.batteryLevel !== null && (
                  <div className="flex items-center gap-2">
                    <Battery size={14} />
                    <span>
                      {device.batteryLevel}%{" "}
                      {device.batteryStatus && `(${device.batteryStatus})`}
                    </span>
                  </div>
                )}
                {device.wifiSsid && (
                  <div className="flex items-center gap-2">
                    <Wifi size={14} />
                    <span>{device.wifiSsid}</span>
                  </div>
                )}
                {device.lastActiveAt && (
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>
                      Last active: {new Date(device.lastActiveAt).toLocaleString()}
                    </span>
                  </div>
                )}
                {!device.batteryLevel && !device.wifiSsid && !device.lastActiveAt && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    No state data available
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
