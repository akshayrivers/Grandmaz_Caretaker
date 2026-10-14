import { useEffect, useState } from "react";
import { useAuth } from "~/contexts/auth";
import { api, describeError } from "~/lib/api";
import { E164_REGEX } from "~/lib/types";
import { ErrorBanner } from "~/components/error-banner";
import { LoadingSpinner } from "~/components/loading-spinner";

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setPhone(user.phoneE164 ?? "");
  }, [user]);

  const handleSave = async () => {
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !E164_REGEX.test(trimmedPhone)) {
      setError("Use international format, e.g. +919876543210.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api.updateProfile({
        name: name.trim(),
        phoneE164: trimmedPhone || null,
      });
      await refreshUser();
      setNotice("Profile saved. This number is used when grandma presses SOS.");
    } catch (err) {
      setError(describeError(err, "Couldn't save your profile."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading profile..." />;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Grandma's phone calls this number during SOS.
        </p>
      </div>
      <ErrorBanner message={error} />
      {notice && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400">
          {notice}
        </div>
      )}
      <form
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Email
          <input
            value={user?.email ?? ""}
            disabled
            className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Phone number
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+919876543210"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
