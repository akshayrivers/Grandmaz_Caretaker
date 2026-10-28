import { useEffect, useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "~/contexts/auth";
import { api, describeError } from "~/lib/api";
import type {
  AuditLog,
  Caretaker,
  CommandRecord,
  CreatedInvitation,
  DeviceConfig,
  DeviceConfigRecord,
  HelpRequest,
  HelpRequestStatus,
  Invitation,
  Role,
  Snapshot,
} from "~/lib/types";
import { DEFAULT_GEMINI_MODEL, canSendCommands } from "~/lib/types";
import { StatusBadge } from "~/components/status-badge";
import { ErrorBanner } from "~/components/error-banner";
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
  Mic,
  Clock,
  Send,
  X,
} from "lucide-react";

type Tab = "state" | "assistant" | "caretakers" | "commands" | "help" | "audit";

export default function DeviceDetail() {
  const { deviceId } = useParams();
  const { firebaseUser, user } = useAuth();
  const signedIn = Boolean(firebaseUser) || Boolean(user);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("state");
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [state, setState] = useState<Snapshot | null>(null);
  const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
  const [commands, setCommands] = useState<CommandRecord[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn || !deviceId) return;
    void loadAll();
  }, [signedIn, deviceId]);

  async function loadAll() {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    try {
      const [device, s, c, cmd, h, a] = await Promise.all([
        api.getDevice(deviceId),
        api.getDeviceLatestState(deviceId).catch(() => null),
        api.getDeviceCaretakers(deviceId),
        api.getDeviceCommands(deviceId),
        api.getDeviceHelpRequests(deviceId),
        api.getDeviceAuditLogs(deviceId),
      ]);
      setMyRole(device.role);
      setState(s);
      setCaretakers(c);
      setCommands(cmd);
      setHelpRequests(h);
      setAuditLogs(a);
    } catch (err) {
      setError(describeError(err, "Couldn't load this device."));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner message="Loading device..." />;

  const tabs: { key: Tab; label: string; icon: typeof Users; count?: number }[] = [
    { key: "state", label: "State", icon: Battery },
    { key: "assistant", label: "Assistant", icon: Mic },
    { key: "caretakers", label: "Caretakers", icon: Users, count: caretakers.length },
    { key: "commands", label: "Commands", icon: Terminal, count: commands.length },
    {
      key: "help",
      label: "Help",
      icon: AlertCircle,
      count: helpRequests.filter((h) => h.status !== "resolved").length,
    },
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Device</h1>
        <p className="mt-1 font-mono text-sm text-gray-500">{deviceId}</p>
        {myRole && <div className="mt-2"><StatusBadge status={myRole} /></div>}
      </div>
      <ErrorBanner message={error} />
      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-500"
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>
      {tab === "state" && <StateTab state={state} />}
      {tab === "assistant" && deviceId && (
        <AssistantTab deviceId={deviceId} canWrite={canSendCommands(myRole ?? "viewer")} />
      )}
      {tab === "caretakers" && deviceId && (
        <CaretakersTab
          caretakers={caretakers}
          deviceId={deviceId}
          isPrimary={myRole === "primary"}
          onRefresh={loadAll}
        />
      )}
      {tab === "commands" && <CommandsTab commands={commands} />}
      {tab === "help" && (
        <HelpTab
          requests={helpRequests}
          canResolve={canSendCommands(myRole ?? "viewer")}
          onResolve={async (id, status) => {
            try {
              const updated = await api.resolveHelpRequest(id, status);
              setHelpRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
            } catch (err) {
              setError(describeError(err, "Couldn't update that request."));
            }
          }}
        />
      )}
      {tab === "audit" && <AuditTab logs={auditLogs} />}
    </div>
  );
}


function AssistantTab({ deviceId, canWrite }: { deviceId: string; canWrite: boolean }) {
  const [record, setRecord] = useState<DeviceConfigRecord | null>(null);
  const [config, setConfig] = useState<DeviceConfig | null>(null);
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getDeviceConfig(deviceId).then((loaded) => {
      if (cancelled) return;
      setRecord(loaded);
      setConfig(loaded.config);
      setModel(loaded.config.voice.model?.trim() || DEFAULT_GEMINI_MODEL);
    }).catch((err) => {
      if (!cancelled) setProblem(describeError(err, "Couldn't load the assistant model."));
    });
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  async function save() {
    const nextModel = model.trim().replace(/^models\//, "");
    if (!nextModel || !config || !record) {
      setProblem("Enter a model id.");
      return;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(nextModel)) {
      setProblem("Enter a model id such as gemini-3.8-flash.");
      return;
    }
    setSaving(true);
    setProblem(null);
    setNotice(null);
    try {
      const saved = await api.putDeviceConfig(deviceId, record.version, {
        ...config,
        voice: { ...config.voice, model: nextModel },
      });
      setRecord(saved);
      setConfig(saved.config);
      setModel(saved.config.voice.model);
      setNotice(`Saved ${saved.config.voice.model} as version ${saved.version}.`);
    } catch (err) {
      setProblem(describeError(err, "Couldn't save the model."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="max-w-xl space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gemini model</h2>
      <p className="text-sm text-gray-500">
        The phone uses this model id when she asks. The Gemini key stays on the server.
      </p>
      <ErrorBanner message={problem} />
      {notice && <p className="text-sm text-gray-700 dark:text-gray-300">{notice}</p>}
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="gemini-model">
        Model id
      </label>
      <input
        id="gemini-model"
        value={model}
        disabled={!canWrite || saving}
        onChange={(event) => setModel(event.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
      />
      {canWrite && (
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !config}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          {saving ? "Saving…" : "Save model"}
        </button>
      )}
    </section>
  );
}

function StateTab({ state }: { state: Snapshot | null }) {
  if (!state) {
    return <p className="text-sm text-gray-500">No state has been reported yet.</p>;
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card icon={<Battery size={20} />} label="Battery" value={state.batteryLevel != null ? `${state.batteryLevel}%` : "Unknown"} sub={state.batteryStatus ?? undefined} />
        <Card icon={<Wifi size={20} />} label="WiFi" value={state.wifiSsid ?? "Unknown"} />
        <Card icon={<HardDrive size={20} />} label="Storage free" value={state.storageFreeMb != null ? `${Math.round(state.storageFreeMb)} MB` : "Unknown"} />
      </div>
      <p className="text-xs text-gray-400">Last snapshot: {new Date(state.createdAt).toLocaleString()}</p>
    </div>
  );
}

function Card({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
        {icon}
        {label}
      </div>
      <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function CaretakersTab({
  caretakers,
  deviceId,
  isPrimary,
  onRefresh,
}: {
  caretakers: Caretaker[];
  deviceId: string;
  isPrimary: boolean;
  onRefresh: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"caretaker" | "viewer">("caretaker");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [pending, setPending] = useState<Invitation[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .getDeviceInvitations(deviceId)
      .then((rows) => {
        if (!cancelled) setPending(rows.filter((row) => row.status === "pending"));
      })
      .catch(() => {
        if (!cancelled) setPending([]);
      });
    return () => {
      cancelled = true;
    };
  }, [deviceId, caretakers]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      onRefresh();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />
      {message && <p className="text-sm text-green-700 dark:text-green-400">{message}</p>}
      {isPrimary && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const invite = await api.createInvitation(deviceId, { email, role });
              setCreated(invite);
              setEmail("");
              setMessage(
                invite.acceptPath
                  ? `Invitation saved for ${invite.email}. Email was not sent. Open ${invite.acceptPath} and use pairing code ${invite.pairingCode}.`
                  : `Invitation sent to ${invite.email}. Pairing code: ${invite.pairingCode}`,
              );
            });
          }}
        >
          <input
            type="email"
            required
            aria-label="Caretaker email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="caretaker@example.com"
            className="min-w-56 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <select
            aria-label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as "caretaker" | "viewer")}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="caretaker">Caretaker</option>
            <option value="viewer">Viewer</option>
          </select>
          <button disabled={busy} className="flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-gray-900">
            <Send size={14} /> Invite
          </button>
        </form>
      )}
      {created && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          Tell them this pairing code, shown once: <span className="font-mono text-lg">{created.pairingCode}</span>
        </p>
      )}
      {pending.length > 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
          <p className="font-medium text-gray-900 dark:text-white">Pending invitations</p>
          {pending.map((invite) => (
            <p key={invite.id} className="mt-1">
              {invite.email} · {invite.role} · {invite.status}
            </p>
          ))}
        </div>
      )}
      {caretakers.map((c) => (
        <div key={c.caretakerId} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {c.name || c.email} {c.isMe ? "(you)" : ""}
            </p>
            <p className="text-xs text-gray-500">{c.email}{c.phoneE164 ? ` · ${c.phoneE164}` : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={c.role} />
            {isPrimary && !c.isMe && c.role !== "primary" && (
              <>
                <button
                  disabled={busy}
                  onClick={() => void run(async () => {
                    await api.transferPrimary(deviceId, c.caretakerId);
                    setMessage(`${c.email} is now the primary caretaker.`);
                  })}
                  className="rounded-md px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Make primary
                </button>
                <button
                  disabled={busy}
                  onClick={() => void run(async () => {
                    await api.removeCaretaker(deviceId, c.caretakerId);
                    setMessage(`${c.email} was removed.`);
                  })}
                  className="rounded-md p-1 text-gray-400 hover:text-red-600"
                  aria-label={`Remove ${c.email}`}
                >
                  <X size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CommandsTab({ commands }: { commands: CommandRecord[] }) {
  if (commands.length === 0) return <p className="text-sm text-gray-500">No commands sent yet.</p>;
  return (
    <div className="space-y-2">
      {commands.map((cmd) => (
        <div key={cmd.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start justify-between">
            <p className="font-medium text-gray-900 dark:text-white">{cmd.type}</p>
            <StatusBadge status={cmd.status} />
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            <Clock size={12} /> {new Date(cmd.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

function HelpTab({
  requests,
  canResolve,
  onResolve,
}: {
  requests: HelpRequest[];
  canResolve: boolean;
  onResolve: (id: string, status: HelpRequestStatus) => Promise<void>;
}) {
  if (requests.length === 0) return <p className="text-sm text-gray-500">No help requests.</p>;
  return (
    <div className="space-y-2">
      {requests.map((r) => (
        <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">{r.title}</h4>
              <div className="mt-1 flex gap-2">
                <StatusBadge status={r.type} />
                <StatusBadge status={r.status} />
              </div>
            </div>
            {canResolve && r.status !== "resolved" && r.status !== "cancelled" && (
              <div className="flex gap-1">
                {r.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => void onResolve(r.id, "in_progress")}
                    className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                  >
                    In progress
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void onResolve(r.id, "resolved")}
                  className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700"
                >
                  Resolve
                </button>
                <button
                  type="button"
                  onClick={() => void onResolve(r.id, "cancelled")}
                  className="rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          {r.description && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{r.description}</p>}
          <p className="mt-2 text-xs text-gray-400">{new Date(r.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

function AuditTab({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) return <p className="text-sm text-gray-500">No audit logs yet.</p>;
  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="font-medium text-gray-900 dark:text-white">{log.action}</p>
          <p className="text-xs text-gray-500">{log.userId ?? "System"} · {new Date(log.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
