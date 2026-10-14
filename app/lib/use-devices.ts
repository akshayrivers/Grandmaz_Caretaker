import { useCallback, useEffect, useState } from "react";
import { useAuth } from "~/contexts/auth";
import { api, describeError } from "~/lib/api";
import type { DeviceSummary } from "~/lib/types";

export function useMyDevices() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!firebaseUser) {
      setDevices([]);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      setDevices(await api.getMyDevices());
    } catch (err) {
      setError(describeError(err, "Couldn't load your devices."));
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (authLoading) return;
    void reload();
  }, [authLoading, reload]);

  return { devices, loading: authLoading || loading, error, reload };
}
