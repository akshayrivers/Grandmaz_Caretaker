import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "~/contexts/auth";
import { api } from "~/lib/api";
import type { Invitation } from "~/lib/types";
import { LoadingSpinner } from "~/components/loading-spinner";
import { CheckCircle, XCircle, Mail } from "lucide-react";

function saveDeviceLink(deviceId: string, role: string) {
  const existing = JSON.parse(
    localStorage.getItem("linked_devices") || "[]",
  ) as Array<{ deviceId: string; displayName: string; role: string }>;
  if (!existing.some((d) => d.deviceId === deviceId)) {
    existing.push({ deviceId, displayName: deviceId, role });
    localStorage.setItem("linked_devices", JSON.stringify(existing));
  }
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { user, firebaseUser, signInWithGoogle, loading: authLoading } = useAuth();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [fetching, setFetching] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided.");
      setFetching(false);
      return;
    }
    api
      .getInvitation(token)
      .then(setInvitation)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load invitation"),
      )
      .finally(() => setFetching(false));
  }, [token]);

  const handleAccept = async () => {
    if (!user || !token || !firebaseUser) return;
    setAccepting(true);
    setError(null);
    try {
      const result = await api.acceptInvitation(
        await firebaseUser.getIdToken(),
        token,
      );
      if (result.device) {
        saveDeviceLink(result.device.device_id, "secondary");
      }
      setSuccess(true);
      setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to accept invitation";
      setError(message);
      setAccepting(false);
    }
  };

  if (authLoading || fetching) return <LoadingSpinner />;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Invalid Link
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            No invitation token was provided.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-sm rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900/50 dark:bg-gray-900">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-sm rounded-xl border border-green-200 bg-white p-8 text-center shadow-sm dark:border-green-900/50 dark:bg-gray-900">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            You're in!
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center">
          <Mail className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            You're Invited!
          </h1>
          {invitation && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Email:{" "}
                <span className="font-medium text-gray-900 dark:text-white">
                  {invitation.email}
                </span>
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Device:{" "}
                <span className="font-medium text-gray-900 dark:text-white">
                  {invitation.deviceId}
                </span>
              </p>
              {invitation.valid === false && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  This invitation has expired or was already accepted.
                </p>
              )}
            </div>
          )}
        </div>

        {!user ? (
          <button
            onClick={signInWithGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google to Accept
          </button>
        ) : (
          <button
            onClick={handleAccept}
            disabled={accepting || invitation?.valid === false}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {accepting ? "Accepting..." : "Accept Invitation"}
          </button>
        )}

        <button
          onClick={() => navigate("/")}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Back to home
        </button>
      </div>
    </div>
  );
}
