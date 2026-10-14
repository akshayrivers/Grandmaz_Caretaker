import { Link } from "react-router";
import { useMyDevices } from "~/lib/use-devices";
import { StatusBadge } from "~/components/status-badge";
import { ErrorBanner } from "~/components/error-banner";
import { LoadingSpinner } from "~/components/loading-spinner";
import { Monitor, Battery, Wifi, Clock } from "lucide-react";

export default function DashboardHome() {
  const { devices, loading, error } = useMyDevices();

  if (loading) return <LoadingSpinner message="Loading your devices..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Devices</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Devices you're caring for</p>
      </div>

      <ErrorBanner message={error} />

      {devices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <Monitor className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No devices yet</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Enter your email on grandma's phone, then open the invitation and type the pairing code.
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
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {device.displayName || device.deviceId}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{device.role}</p>
                  </div>
                </div>
                <StatusBadge status={device.isVerified ? "active" : "inactive"} />
              </div>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {device.batteryLevel !== null && (
                  <div className="flex items-center gap-2">
                    <Battery size={14} />
                    <span>
                      {device.batteryLevel}%{device.batteryStatus ? ` (${device.batteryStatus})` : ""}
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
                    <span>Last active: {new Date(device.lastActiveAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
