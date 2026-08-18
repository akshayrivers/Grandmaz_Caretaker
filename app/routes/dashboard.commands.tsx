import { useEffect, useState } from "react";
import { useAuth } from "~/contexts/auth";
import { api } from "~/lib/api";
import type { Task } from "~/lib/types";
import { StatusBadge } from "~/components/status-badge";
import { LoadingSpinner } from "~/components/loading-spinner";
import {
  Terminal,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
} from "lucide-react";

export default function CommandsPage() {
  const { idToken, user } = useAuth();
  const [commands, setCommands] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  const [showCreate, setShowCreate] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [title, setTitle] = useState("");
  const [command, setCommand] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  useEffect(() => {
    loadCommands();
  }, [idToken, filter]);

  async function loadCommands() {
    if (!idToken) return;
    setLoading(true);
    try {
      let deviceIds: string[] = [];

      try {
        const backendDevices = await api.getMyDevices(idToken);
        if (backendDevices && backendDevices.length > 0) {
          deviceIds = backendDevices.map((d) => d.deviceId || d.id);
          const toStore = backendDevices.map((d) => ({
            deviceId: d.deviceId || d.id,
            displayName: d.displayName || d.deviceId,
            role: d.caretakerRole || "primary",
          }));
          localStorage.setItem("linked_devices", JSON.stringify(toStore));
          if (!deviceId && deviceIds.length > 0) {
            setDeviceId(deviceIds[0]!);
          }
        }
      } catch {}

      if (deviceIds.length === 0) {
        const stored = JSON.parse(
          localStorage.getItem("linked_devices") || "[]",
        ) as Array<{ deviceId: string }>;
        deviceIds = stored.map((d) => d.deviceId);
        if (!deviceId && deviceIds.length > 0) {
          setDeviceId(deviceIds[0]!);
        }
      }

      const allCommands: Task[] = [];
      for (const id of deviceIds) {
        try {
          const cmds = await api.getDeviceCommands(
            idToken,
            id,
            filter || undefined,
          );
          allCommands.push(...cmds);
        } catch {}
      }
      allCommands.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setCommands(allCommands);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async () => {
    if (!idToken || !deviceId || !title || !command) return;
    setCreating(true);
    setCreateMsg(null);
    try {
      await api.createCommand(idToken, {
        deviceId,
        title,
        command,
        description: description || undefined,
      });
      setCreateMsg("Command sent successfully!");
      setTitle("");
      setCommand("");
      setDescription("");
      setShowCreate(false);
      loadCommands();
    } catch (err: unknown) {
      setCreateMsg(err instanceof Error ? err.message : "Failed to create command");
    } finally {
      setCreating(false);
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case "completed":
        return <CheckCircle size={16} className="text-green-500" />;
      case "failed":
        return <XCircle size={16} className="text-red-500" />;
      case "running":
      case "sent":
        return <Loader2 size={16} className="animate-spin text-blue-500" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  if (loading && commands.length === 0) {
    return <LoadingSpinner message="Loading commands..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Commands
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Remote task execution
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          <Send size={16} /> New Command
        </button>
      </div>

      {createMsg && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            createMsg.includes("success")
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {createMsg}
        </div>
      )}

      {showCreate && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            Send New Command
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Device ID"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            <input
              type="text"
              placeholder="Command title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            <input
              type="text"
              placeholder="Command (e.g. open_app, send_notification)"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono dark:border-gray-700 dark:bg-gray-800"
            />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !deviceId || !title || !command}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900"
              >
                {creating ? "Sending..." : "Send Command"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {["", "pending", "sent", "running", "completed", "failed"].map((s) => (
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

      {commands.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <Terminal className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            No commands yet
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Send your first command to a device
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {commands.map((cmd) => (
            <div
              key={cmd.id}
              className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mt-0.5">{statusIcon(cmd.status)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {cmd.title}
                  </h4>
                  <StatusBadge status={cmd.status} />
                </div>
                <p className="mt-1 font-mono text-xs text-gray-600 dark:text-gray-400">
                  {cmd.command}
                </p>
                {cmd.description && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {cmd.description}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs text-gray-400">
                {new Date(cmd.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
