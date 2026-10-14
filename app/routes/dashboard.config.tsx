import { useCallback, useEffect, useState } from "react";
import { api, ApiError, describeError } from "~/lib/api";
import { E164_REGEX, canSendCommands, type Caretaker, type DeviceConfig, type DeviceConfigRecord } from "~/lib/types";
import { useMyDevices } from "~/lib/use-devices";
import { ErrorBanner } from "~/components/error-banner";
import { LoadingSpinner } from "~/components/loading-spinner";

function newId(prefix: string) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

export default function HomeSetupPage() {
  const { devices, loading: devicesLoading, error: devicesError } = useMyDevices();
  const [deviceId, setDeviceId] = useState("");
  const [record, setRecord] = useState<DeviceConfigRecord | null>(null);
  const [config, setConfig] = useState<DeviceConfig | null>(null);
  const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = devices.find((device) => device.deviceId === deviceId);
  const canWrite = canSendCommands(selected?.role);

  useEffect(() => {
    if (!deviceId && devices[0]) setDeviceId(devices[0].deviceId);
  }, [devices, deviceId]);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setConflict(false);
    setNotice(null);
    try {
      const [next, people] = await Promise.all([
        api.getDeviceConfig(id),
        api.getDeviceCaretakers(id),
      ]);
      setRecord(next);
      setConfig(structuredClone(next.config));
      setCaretakers(people);
    } catch (err) {
      setError(describeError(err, "Couldn't load the phone's home settings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    void load(deviceId);
  }, [deviceId, load]);

  const update = (patch: (current: DeviceConfig) => DeviceConfig) => {
    setConfig((current) => (current ? patch(current) : current));
  };

  const pinnedCount = config?.contacts.filter((contact) => contact.pinned).length ?? 0;

  const save = async () => {
    if (!config || !record || !canWrite) return;
    for (const contact of config.contacts) {
      if (!contact.name.trim()) {
        setError("Every person needs a name.");
        return;
      }
      for (const phone of contact.phones) {
        if (!E164_REGEX.test(phone.e164)) {
          setError(`Use international format for ${contact.name}, e.g. +919876543210.`);
          return;
        }
      }
    }
    const pinnedIds = config.contacts.filter((contact) => contact.pinned).map((contact) => contact.id);
    if (pinnedIds.length > 4) {
      setError("Pin at most four people on the home screen.");
      return;
    }
    const next: DeviceConfig = {
      ...config,
      home: { ...config.home, pinnedContactIds: pinnedIds },
    };
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await api.putDeviceConfig(deviceId, record.version, next);
      setRecord(saved);
      setConfig(structuredClone(saved.config));
      setConflict(false);
      setNotice(`Saved as version ${saved.version}.`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFIG_VERSION_CONFLICT") {
        setConflict(true);
      }
      setError(describeError(err, "Couldn't save."));
    } finally {
      setSaving(false);
    }
  };

  if (devicesLoading) return <LoadingSpinner message="Loading devices..." />;

  const primary = caretakers.find((person) => person.caretakerId === config?.emergency.primaryCaretakerUserId)
    ?? caretakers.find((person) => person.role === "primary");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Home setup</h1>
        <p className="text-sm text-gray-500">People, the four home photos, weather city, and who SOS calls. The phone PIN stays on the phone.</p>
      </div>
      {devicesError && <ErrorBanner message={devicesError} />}
      {error && <ErrorBanner message={error} />}
      {notice && <p className="text-sm text-green-700">{notice}</p>}
      {conflict && (
        <button type="button" className="rounded-md bg-amber-700 px-3 py-2 text-sm text-white" onClick={() => deviceId && void load(deviceId)}>
          Reload the latest version
        </button>
      )}

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Phone
        <select
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          value={deviceId}
          onChange={(event) => setDeviceId(event.target.value)}
        >
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.displayName || device.deviceId}
            </option>
          ))}
        </select>
      </label>

      {loading || !config || !record ? (
        <LoadingSpinner message="Loading home settings..." />
      ) : (
        <>
          <p className="text-sm text-gray-500">Version {record.version}. {canWrite ? "You can save changes." : "You can look, not change."}</p>

          <section className="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <h2 className="font-semibold">SOS calls</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Primary now: {primary ? `${primary.name || primary.email}${primary.phoneE164 ? ` · ${primary.phoneE164}` : " · no phone on their profile"}` : "Nobody linked yet"}
            </p>
            <label className="block text-sm">
              Call this caretaker
              <select
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                disabled={!canWrite}
                value={config.emergency.primaryCaretakerUserId ?? ""}
                onChange={(event) => update((current) => ({
                  ...current,
                  emergency: { ...current.emergency, primaryCaretakerUserId: event.target.value || null },
                }))}
              >
                <option value="">Whoever is primary</option>
                {caretakers.map((person) => (
                  <option key={person.caretakerId} value={person.caretakerId}>
                    {(person.name || person.email) + (person.role === "primary" ? " (primary)" : "")}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={!canWrite}
                checked={config.emergency.smsFallback}
                onChange={(event) => update((current) => ({
                  ...current,
                  emergency: { ...current.emergency, smsFallback: event.target.checked },
                }))}
              />
              Text a map link if the alert cannot be sent
            </label>
          </section>

          <section className="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <h2 className="font-semibold">Weather city</h2>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              disabled={!canWrite}
              value={config.home.weather.city ?? ""}
              placeholder="Jammu"
              onChange={(event) => update((current) => ({
                ...current,
                home: {
                  ...current.home,
                  weather: {
                    ...current.home.weather,
                    mode: "city",
                    city: event.target.value.trim() ? event.target.value : null,
                    lat: null,
                    lon: null,
                  },
                },
              }))}
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">People ({pinnedCount}/4 on the home screen)</h2>
              {canWrite && (
                <button
                  type="button"
                  className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white"
                  onClick={() => update((current) => ({
                    ...current,
                    contacts: [...current.contacts, {
                      id: newId("c"),
                      name: "",
                      phones: [{ id: newId("p"), label: "", e164: "", whatsapp: false, isDefault: true }],
                      order: current.contacts.length,
                      pinned: false,
                      photoAssetId: null,
                      nameClipId: null,
                    }],
                  }))}
                >
                  Add person
                </button>
              )}
            </div>
            {config.contacts.map((contact, index) => (
              <div key={contact.id} className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <div className="flex gap-3">
                  <input
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                    disabled={!canWrite}
                    value={contact.name}
                    placeholder="Name"
                    onChange={(event) => update((current) => ({
                      ...current,
                      contacts: current.contacts.map((item, i) => i === index ? { ...item, name: event.target.value } : item),
                    }))}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      disabled={!canWrite || (!contact.pinned && pinnedCount >= 4)}
                      checked={contact.pinned}
                      onChange={(event) => update((current) => ({
                        ...current,
                        contacts: current.contacts.map((item, i) => i === index ? { ...item, pinned: event.target.checked } : item),
                      }))}
                    />
                    Home
                  </label>
                </div>
                {contact.phones.map((phone, phoneIndex) => (
                  <div key={phone.id} className="flex flex-wrap items-center gap-2">
                    <input
                      className="min-w-40 flex-1 rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                      disabled={!canWrite}
                      value={phone.e164}
                      placeholder="+91…"
                      onChange={(event) => update((current) => ({
                        ...current,
                        contacts: current.contacts.map((item, i) => i === index ? {
                          ...item,
                          phones: item.phones.map((entry, j) => j === phoneIndex ? { ...entry, e164: event.target.value.trim() } : entry),
                        } : item),
                      }))}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        disabled={!canWrite}
                        checked={phone.whatsapp}
                        onChange={(event) => update((current) => ({
                          ...current,
                          contacts: current.contacts.map((item, i) => i === index ? {
                            ...item,
                            phones: item.phones.map((entry, j) => j === phoneIndex ? { ...entry, whatsapp: event.target.checked } : entry),
                          } : item),
                        }))}
                      />
                      WhatsApp
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`default-${contact.id}`}
                        disabled={!canWrite}
                        checked={phone.isDefault}
                        onChange={() => update((current) => ({
                          ...current,
                          contacts: current.contacts.map((item, i) => i === index ? {
                            ...item,
                            phones: item.phones.map((entry, j) => ({ ...entry, isDefault: j === phoneIndex })),
                          } : item),
                        }))}
                      />
                      Call this
                    </label>
                  </div>
                ))}
                {canWrite && (
                  <button
                    type="button"
                    className="text-sm text-blue-700"
                    onClick={() => update((current) => ({
                      ...current,
                      contacts: current.contacts.map((item, i) => i === index ? {
                        ...item,
                        phones: [...item.phones, { id: newId("p"), label: "", e164: "", whatsapp: false, isDefault: item.phones.length === 0 }],
                      } : item),
                    }))}
                  >
                    Add number
                  </button>
                )}
              </div>
            ))}
          </section>

          {canWrite && (
            <button
              type="button"
              disabled={saving}
              className="rounded-md bg-gray-900 px-4 py-3 text-white disabled:opacity-50"
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save home setup"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
