import { useEffect, useState } from "react";
import { api, describeError } from "~/lib/api";
import { useMyDevices } from "~/lib/use-devices";
import type { Command, CommandRecord, CommandStatus } from "~/lib/types";
import { E164_REGEX, canSendCommands } from "~/lib/types";
import { StatusBadge } from "~/components/status-badge";
import { ErrorBanner } from "~/components/error-banner";
import { LoadingSpinner } from "~/components/loading-spinner";
import { CheckCircle, Clock, Loader2, Send, XCircle } from "lucide-react";

const COMMANDS: { type: Command["type"]; label: string }[] = [
  { type: "ring_device", label: "Ring phone" },
  { type: "sync_now", label: "Sync now" },
  { type: "report_location", label: "Report location" },
  { type: "show_message", label: "Show message" },
  { type: "set_volume", label: "Set volume" },
  { type: "update_emergency_number", label: "Emergency number" },
];

const FILTERS: Array<"" | CommandStatus> = [
  "",
  "pending",
  "running",
  "completed",
  "failed",
  "expired",
  "cancelled",
];

function commandLabel(cmd: CommandRecord) {
  return COMMANDS.find((c) => c.type === cmd.type)?.label ?? cmd.type;
}

export default function CommandsPage() {
  const { devices, loading: devicesLoading, error: devicesError } = useMyDevices();
  const [deviceId, setDeviceId] = useState("");
  const [commands, setCommands] = useState<CommandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"" | CommandStatus>("");
  const [type, setType] = useState<Command["type"]>("ring_device");
  const [text, setText] = useState("");
  const [level, setLevel] = useState(50);
  const [e164, setE164] = useState("");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceId && devices[0]) setDeviceId(devices[0].deviceId);
  }, [devices, deviceId]);

  const selected = devices.find((d) => d.deviceId === deviceId);
  const allowed = canSendCommands(selected?.role);

  useEffect(() => {
    if (devicesLoading) return;
    void loadCommands();
  }, [devicesLoading, deviceId, filter]);

  async function loadCommands() {
    if (!deviceId) {
      setCommands([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await api.getDeviceCommands(deviceId, filter || undefined);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCommands(list);
    } catch (err) {
      setError(describeError(err, "Couldn't load commands."));
    } finally {
      setLoading(false);
    }
  }

  function buildCommand(): Command | string {
    if (type === "show_message") {
      const trimmed = text.trim();
      if (!trimmed) return "Enter the message to show on the phone.";
      return { type, text: trimmed };
    }
    if (type === "set_volume") {
      if (level < 0 || level > 100) return "Volume must be between 0 and 100.";
      return { type, level };
    }
    if (type === "update_emergency_number") {
      if (!E164_REGEX.test(e164.trim())) return "Use international format, e.g. +919876543210.";
      return { type, e164: e164.trim() };
    }
    return { type };
  }

  const handleSend = async () => {
    const command = buildCommand();
    if (typeof command === "string") {
      setError(command);
      return;
    }
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      await api.createCommand(deviceId, command);
      setNotice("Command sent.");
      setText("");
      await loadCommands();
    } catch (err) {
      setError(describeError(err, "Couldn't send that command."));
    } finally {
      setCreating(false);
    }
  };

  if (devicesLoading || (loading && commands.length === 0 && !error)) {
    return <LoadingSpinner message="Loading commands..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Commands</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Send a specific action to grandma's phone
        </p>
      </div>

      <ErrorBanner message={devicesError || error} />
      {notice && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400">
          {notice}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Send a command</h3>
        {devices.length === 0 ? (
          <p className="text-sm text-gray-500">Link a device before sending commands.</p>
        ) : (
          <div className="space-y-3">
            <select
              aria-label="Device"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.displayName || d.deviceId} ({d.role})
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              {COMMANDS.map((c) => (
                <button
                  key={c.type}
                  type="button"
                  onClick={() => setType(c.type)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    type === c.type
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {type === "show_message" && (
              <input
                aria-label="Message shown on the phone"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Message shown on the phone"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            )}
            {type === "set_volume" && (
              <label className="block text-sm text-gray-600 dark:text-gray-400">
                Volume {level}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </label>
            )}
            {type === "update_emergency_number" && (
              <input
                aria-label="Emergency phone number"
                value={e164}
                onChange={(e) => setE164(e.target.value)}
                placeholder="+919876543210"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            )}
            {!allowed && (
              <p className="text-sm text-gray-500">Viewers can't send commands.</p>
            )}
            <button
              onClick={() => void handleSend()}
              disabled={creating || !allowed || !deviceId}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              <Send size={16} /> {creating ? "Sending..." : "Send"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === s
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {s || "all"}
          </button>
        ))}
      </div>

      {commands.length === 0 ? (
        <p className="text-sm text-gray-500">No commands yet.</p>
      ) : (
        <div className="space-y-2">
          {commands.map((cmd) => (
            <div
              key={cmd.id}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{commandLabel(cmd)}</p>
                  <p className="mt-1 font-mono text-xs text-gray-500">{cmd.type}</p>
                  {cmd.result?.message && (
                    <p className="mt-1 text-xs text-gray-500">{cmd.result.message}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {cmd.status === "completed" && <CheckCircle size={16} className="text-green-500" />}
                  {cmd.status === "failed" && <XCircle size={16} className="text-red-500" />}
                  {cmd.status === "running" && <Loader2 size={16} className="animate-spin text-blue-500" />}
                  {cmd.status === "pending" && <Clock size={16} className="text-gray-400" />}
                  <StatusBadge status={cmd.status} />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">{new Date(cmd.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
