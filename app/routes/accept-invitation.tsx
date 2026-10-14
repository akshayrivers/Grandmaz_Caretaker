import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "~/contexts/auth";
import { api, describeError } from "~/lib/api";
import type { InvitationPreview } from "~/lib/types";
import { LoadingSpinner } from "~/components/loading-spinner";
import { ErrorBanner } from "~/components/error-banner";
import { CheckCircle, XCircle, Mail, LogOut } from "lucide-react";

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { firebaseUser, signInWithGoogle, signOut, refreshUser } = useAuth();

  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [fetching, setFetching] = useState(true);
  const [pairingCode, setPairingCode] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("This link is missing an invitation token.");
      setFetching(false);
      return;
    }
    api
      .previewInvitation(token)
      .then(setInvitation)
      .catch((err: unknown) => setError(describeError(err, "Couldn't load this invitation.")))
      .finally(() => setFetching(false));
  }, [token]);

  const emailMismatch =
    invitation?.email &&
    firebaseUser?.email &&
    invitation.email.toLowerCase() !== firebaseUser.email.toLowerCase();

  const handleAccept = async () => {
    if (!token || pairingCode.length !== 6) return;
    setAccepting(true);
    setError(null);
    try {
      await api.acceptInvitation(token, pairingCode);
      await refreshUser();
      setSuccess(true);
      setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
    } catch (err: unknown) {
      setError(describeError(err, "Couldn't accept this invitation."));
    } finally {
      setAccepting(false);
    }
  };

  if (fetching) return <LoadingSpinner message="Loading invitation..." />;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Invalid link</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            No invitation token was provided.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-sm rounded-xl border border-green-200 bg-white p-8 text-center shadow-sm dark:border-green-900/50 dark:bg-gray-900">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">You're linked</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Opening your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Mail className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">You're invited</h1>
          {invitation && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 text-left dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Device:{" "}
                <span className="font-medium text-gray-900 dark:text-white">
                  {invitation.deviceName}
                </span>
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Sent to:{" "}
                <span className="font-medium text-gray-900 dark:text-white">{invitation.email}</span>
              </p>
            </div>
          )}
        </div>

        <ErrorBanner message={error} />

        {!firebaseUser ? (
          <button
            onClick={() => signInWithGoogle().catch((err: unknown) => setError(describeError(err)))}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            Sign in with Google
          </button>
        ) : emailMismatch ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You're signed in as {firebaseUser.email}. This invitation was sent to {invitation?.email}.
            </p>
            <button
              onClick={() => signOut().then(() => signInWithGoogle())}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
            >
              <LogOut size={16} /> Switch account
            </button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void handleAccept();
            }}
          >
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Pairing code shown on grandma's phone
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="\d{6}"
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-center font-mono text-2xl tracking-[0.4em] dark:border-gray-700 dark:bg-gray-800"
                placeholder="000000"
              />
            </label>
            <button
              type="submit"
              disabled={accepting || pairingCode.length !== 6}
              className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              {accepting ? "Linking..." : "Link this device"}
            </button>
          </form>
        )}

        <button
          onClick={() => navigate(firebaseUser ? "/dashboard" : "/")}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
        >
          {firebaseUser ? "Go to dashboard" : "Back to home"}
        </button>
      </div>
    </div>
  );
}
