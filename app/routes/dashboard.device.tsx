import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "~/contexts/auth";
import { api } from "~/lib/api";
import type {
  DeviceCaretaker,
  DeviceStateSnapshot,
  Task,
  HelpRequest,
  AuditLog,
} from "~/lib/types";
import { StatusBadge } from "~/components/status-badge";
import { LoadingSpinner } from "~/components/loading-spinner";
import {
  ArrowLeft,
  Battery,
  Wifi,
  HardDrive,
  Users,
  Terminal,
  AlertCircle,
  ScrollText,
  Clock,
  Send,
  X,
} from "lucide-react";

type Tab = "state" | "caretakers" | "commands" | "help" | "audit";

export default function DeviceDetail() {
  const { deviceId } = useParams();
  const { idToken } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("state");

  const [state, setState] = useState<DeviceStateSnapshot | null>(null);
  const [caretakers, setCaretakers] = useState<DeviceCaretaker[]>([]);
  const [commands, setCommands] = useState<Task[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idToken || !deviceId) return;
    loadAll();
  }, [idToken, deviceId]);

  async function loadAll() {
    if (!idToken || !deviceId) return;
    setLoading(true);
    setError(null);
    try {
      const [s, c, cmd, h, a] = await Promise.allSettled([
        api.getDeviceLatestState(idToken, deviceId),
        api.getDeviceCaretakers(idToken, deviceId),
        api.getDeviceCommands(idToken, deviceId),
        api.getDeviceHelpRequests(idToken, deviceId),
        api.getDeviceAuditLogs(idToken, deviceId),
      ]);
      if (s.status === "fulfilled") setState(s.value);
      if (c.status === "fulfilled") setCaretakers(c.value);
      if (cmd.status === "fulfilled") setCommands(cmd.value);
      if (h.status === "fulfilled") setHelpRequests(h.value);
      if (a.status === "fulfilled") setAuditLogs(a.value);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load device");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner message="Loading device..." />;
  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft size={16} /> Back to devices
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Users; count?: number }[] = [
    { key: "state", label: "State", icon: Battery },
    { key: "caretakers", label: "Caretakers", icon: Users, count: caretakers.length },
    { key: "commands", label: "Commands", icon: Terminal, count: commands.length },
    { key: "help", label: "Help", icon: AlertCircle, count: helpRequests.filter((h) => h.status !== "resolved").length },
    { key: "audit", label: "Audit", icon: ScrollText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft size={16} /> Back to devices
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Device Detail
        </h1>
        <p className="mt-1 font-mono text-sm text-gray-500 dark:text-gray-400">
          {deviceId}
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <t.icon size={16} />
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "state" && <StateTab state={state} />}
      {tab === "caretakers" && (
        <CaretakersTab
          caretakers={caretakers}
          deviceId={deviceId!}
          onRefresh={loadAll}
        />
      )}
      {tab === "commands" && <CommandsTab commands={commands} />}
      {tab === "help" && <HelpTab requests={helpRequests} />}
      {tab === "audit" && <AuditTab logs={auditLogs} />}
    </div>
  );
}

function StateTab({ state }: { state: DeviceStateSnapshot | null }) {
  if (!state) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
        <Battery className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No state data available for this device yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StateCard
          icon={<Battery size={20} />}
          label="Battery"
          value={
            state.battery_level !== null
              ? `${state.battery_level}%`
              : "Unknown"
          }
          sub={state.battery_status ?? undefined}
        />
        <StateCard
          icon={<Wifi size={20} />}
          label="WiFi"
          value={state.wifi_ssid ?? "Unknown"}
        />
        <StateCard
          icon={<HardDrive size={20} />}
          label="Storage Free"
          value={
            state.storage_free_mb !== null
              ? `${Math.round(state.storage_free_mb)} MB`
              : "Unknown"
          }
        />
      </div>

      {state.snapshot_data && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Snapshot Data
          </h3>
          <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {JSON.stringify(state.snapshot_data, null, 2)}
          </pre>
        </div>
      )}

      {state.installed_apps != null && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Installed Apps
          </h3>
          <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {JSON.stringify(state.installed_apps, null, 2) as string}
          </pre>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Last snapshot: {new Date(state.created_at).toLocaleString()}
      </p>
    </div>
  );
}

function StateCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 flex items-center gap-2 text-gray-500 dark:text-gray-400">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
      {sub && (
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</p>
      )}
    </div>
  );
}

function CaretakersTab({
  caretakers,
  deviceId,
  onRefresh,
}: {
  caretakers: DeviceCaretaker[];
  deviceId: string;
  onRefresh: () => void;
}) {
  const { idToken } = useAuth();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!idToken || !inviteEmail) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      await api.createInvitation(idToken, {
        deviceId,
        email: inviteEmail,
      });
      setInviteMsg(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setShowInvite(false);
      onRefresh();
    } catch (err: unknown) {
      setInviteMsg(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Linked Caretakers
        </h3>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          <Send size={14} /> Invite
        </button>
      </div>

      {inviteMsg && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400">
          {inviteMsg}
        </div>
      )}

      {showInvite && (
        <div className="flex items-center gap-2">
          <input
            type="email"
            placeholder="caretaker@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            {inviting ? "Sending..." : "Send"}
          </button>
          <button
            onClick={() => setShowInvite(false)}
            className="rounded-lg p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {caretakers.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No caretakers linked yet.
        </p>
      ) : (
        <div className="space-y-2">
          {caretakers.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {c.caretaker?.email ?? (c as any).email ?? c.caretaker_id}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {c.caretaker?.name ?? (c as any).name ?? "Caretaker"}
                </p>
              </div>
              <StatusBadge status={c.role} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommandsTab({ commands }: { commands: Task[] }) {
  return (
    <div className="space-y-4">
      {commands.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <Terminal className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No commands sent yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {commands.map((cmd) => (
            <div
              key={cmd.id}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-2 flex items-start justify-between">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {cmd.title}
                </h4>
                <StatusBadge status={cmd.status} />
              </div>
              <p className="mb-1 font-mono text-xs text-gray-600 dark:text-gray-400">
                {cmd.command}
              </p>
              {cmd.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {cmd.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(cmd.created_at).toLocaleString()}
                </span>
                {cmd.completed_at && (
                  <span>
                    Completed: {new Date(cmd.completed_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HelpTab({ requests }: { requests: HelpRequest[] }) {
  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No help requests.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {r.title}
                  </h4>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={r.type} />
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              </div>
              {r.description && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {r.description}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-400">
                {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditTab({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="space-y-4">
      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <ScrollText className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No audit logs yet.
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
                    {log.details && (
                      <pre className="mt-1 max-w-xs overflow-hidden text-xs text-gray-500 dark:text-gray-400">
                        {JSON.stringify(log.details)}
                      </pre>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {log.user_id ?? "System"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(log.created_at).toLocaleString()}
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
