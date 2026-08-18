import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "~/contexts/auth";
import { api } from "~/lib/api";
import type { DeviceCaretaker } from "~/lib/types";
import { StatusBadge } from "~/components/status-badge";
import { LoadingSpinner } from "~/components/loading-spinner";
import { Monitor, Battery, Wifi, Clock, AlertCircle, UserPlus } from "lucide-react";

interface DeviceWithState {
  deviceId: string;
  displayName: string;
  status: string;
  isVerified: boolean;
  lastActiveAt: string | null;
  batteryLevel: number | null;
  batteryStatus: string | null;
  wifiSsid: string | null;
  caretakerRole: string;
}

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
      const profile = await api.getUserProfile(idToken);
      const deviceId = profile.role;

      // We need to get devices for this user. The backend returns caretakers for a device.
      // Since we don't have a direct "my devices" endpoint, we'll use the user profile
      // and fetch based on what we can.
      // For now, we'll fetch devices the user is linked to via the caretakers endpoint.
      // The backend needs a "my devices" endpoint - until then, we'll try a common pattern.

      // Actually, looking at the backend API, there's no "list my devices" endpoint.
      // The caretaker link is via device_caretakers. We need the user's devices.
      // Let's try to get this from the user profile or make a reasonable call.
      // The GET /api/auth/me returns the user, and the user has a role.
      // We'll need to fetch devices differently. Let's check if there's an endpoint.

      // Based on the API docs, there's no "list devices for user" endpoint.
      // We'll need to store the device IDs somewhere or use a workaround.
      // For now, let's just display what we can from the auth response.

      // Actually, the verify endpoint returns the user which includes their device links.
      // Let me check... the backend might return device info in the user response.
      // Since we don't know the exact response shape, let's handle both cases.

      // For now, let's just show a placeholder and let the user navigate.
      // TODO: The backend needs a GET /api/users/me/devices or similar endpoint.
      // For the interim, we'll store device IDs in localStorage from invitation acceptance.
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
            deviceId: d.deviceId,
            displayName: d.displayName || d.deviceId,
            status: "active",
            isVerified: true,
            lastActiveAt: state?.created_at || null,
            batteryLevel: state?.battery_level ?? null,
            batteryStatus: state?.battery_status ?? null,
            wifiSsid: state?.wifi_ssid ?? null,
            caretakerRole: d.role,
          });
        } catch {
          devicesWithState.push({
            deviceId: d.deviceId,
            displayName: d.displayName || d.deviceId,
            status: "unknown",
            isVerified: false,
            lastActiveAt: null,
            batteryLevel: null,
            batteryStatus: null,
            wifiSsid: null,
            caretakerRole: d.role,
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
