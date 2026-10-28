import { useEffect, useState } from "react";
import { api, describeError } from "~/lib/api";
import { useMyDevices } from "~/lib/use-devices";
import type { AuditLog } from "~/lib/types";
import { ErrorBanner } from "~/components/error-banner";
import { LoadingSpinner } from "~/components/loading-spinner";
import { ScrollText } from "lucide-react";

export default function AuditPage() {
  const { devices, loading: devicesLoading, error: devicesError } = useMyDevices();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (devicesLoading) return;
    void loadLogs();
  }, [devicesLoading, devices]);

  async function loadLogs() {
    setLoading(true);
    setError(null);
    try {
      const failures: string[] = [];
      const lists = await Promise.all(
        devices.map(async (d) => {
          try {
            return await api.getDeviceAuditLogs(d.deviceId);
          } catch (err) {
            failures.push(describeError(err, "Couldn't load audit logs."));
            return [] as AuditLog[];
          }
        }),
      );
      const all = lists.flat();
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLogs(all);
      if (failures.length > 0) setError(failures[0] ?? null);
    } catch (err) {
      setError(describeError(err, "Couldn't load audit logs."));
    } finally {
      setLoading(false);
    }
  }

  if (devicesLoading || loading) return <LoadingSpinner message="Loading audit logs..." />;

  return (
    <div className="space-y-6">
      <ErrorBanner message={devicesError || error} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Audit Logs
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Activity trail across your devices
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <ScrollText className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            No logs yet
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Activity will appear here as it happens
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Action
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Details
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                  User
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {logs.map((log) => (
                <tr key={log.id} className="bg-white dark:bg-gray-950">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {log.action}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    {log.details ? (
                      <pre className="overflow-hidden text-xs text-gray-500 dark:text-gray-400">
                        {JSON.stringify(log.details)}
                      </pre>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {log.userId ?? "System"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
