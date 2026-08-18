import { useEffect, useState } from "react";
import { useAuth } from "~/contexts/auth";
import { api } from "~/lib/api";
import type { HelpRequest } from "~/lib/types";
import { StatusBadge } from "~/components/status-badge";
import { LoadingSpinner } from "~/components/loading-spinner";
import { AlertCircle, CheckCircle, Clock, Stethoscope, Wrench } from "lucide-react";

const typeIcons: Record<string, typeof AlertCircle> = {
  sos: AlertCircle,
  medical: Stethoscope,
  tech_support: Wrench,
  general: Clock,
};

export default function HelpPage() {
  const { idToken } = useAuth();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    loadHelpRequests();
  }, [idToken]);

  async function loadHelpRequests() {
    if (!idToken) return;
    setLoading(true);
    try {
      const stored = JSON.parse(
        localStorage.getItem("linked_devices") || "[]",
      ) as Array<{ deviceId: string }>;

      const all: HelpRequest[] = [];
      for (const d of stored) {
        try {
          const reqs = await api.getDeviceHelpRequests(idToken, d.deviceId);
          all.push(...reqs);
        } catch {}
      }
      all.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setRequests(all);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const handleResolve = async (id: string, status: string) => {
    if (!idToken) return;
    try {
      await api.resolveHelpRequest(idToken, id, status);
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
    } catch {}
  };

  const filtered = filter
    ? requests.filter((r) => r.status === filter || r.type === filter)
    : requests;

  if (loading) return <LoadingSpinner message="Loading help requests..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Help Requests
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Requests from devices
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {["", "pending", "in_progress", "resolved", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === s
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            All clear
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No help requests {filter ? `with status "${filter}"` : ""}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const Icon = typeIcons[req.type] || AlertCircle;
            return (
              <div
                key={req.id}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${
                        req.type === "sos"
                          ? "bg-red-100 text-red-600 dark:bg-red-900/30"
                          : req.type === "medical"
                            ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800"
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {req.title}
                      </h4>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusBadge status={req.type} />
                        <StatusBadge status={req.status} />
                      </div>
                      {req.description && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          {req.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {req.status !== "resolved" && req.status !== "cancelled" && (
                    <div className="flex gap-1">
                      {req.status === "pending" && (
                        <button
                          onClick={() => handleResolve(req.id, "in_progress")}
                          className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          In Progress
                        </button>
                      )}
                      <button
                        onClick={() => handleResolve(req.id, "resolved")}
                        className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleResolve(req.id, "cancelled")}
                        className="rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <p className="mt-3 text-xs text-gray-400">
                  {new Date(req.created_at).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
