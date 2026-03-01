import { useState, useEffect, useCallback } from "react";

interface CalendarState {
  authorized: boolean;
  loading: boolean;
  syncing: boolean;
  lastResult: string | null;
  error: string | null;
}

export function useCalendar() {
  const [state, setState] = useState<CalendarState>({
    authorized: false,
    loading: true,
    syncing: false,
    lastResult: null,
    error: null,
  });

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/gcal/auth");
      const data = await res.json();
      setState((s) => ({ ...s, authorized: data.authorized, loading: false }));
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const authorize = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/gcal/authorize", { method: "POST" });
      const data = await res.json();
      if (data.authorized) {
        setState((s) => ({ ...s, authorized: true, loading: false }));
      } else {
        setState((s) => ({ ...s, loading: false, error: data.error }));
      }
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: "Authorization failed" }));
    }
  }, []);

  const syncToCalendar = useCallback(async () => {
    setState((s) => ({ ...s, syncing: true, error: null, lastResult: null }));
    try {
      const res = await fetch("/api/gcal/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setState((s) => ({ ...s, syncing: false, error: data.error }));
      } else {
        setState((s) => ({
          ...s,
          syncing: false,
          lastResult: `Synced ${data.synced} assignments`,
        }));
      }
    } catch {
      setState((s) => ({ ...s, syncing: false, error: "Sync failed" }));
    }
  }, []);

  return {
    authorized: state.authorized,
    loading: state.loading,
    syncing: state.syncing,
    lastResult: state.lastResult,
    error: state.error,
    authorize,
    syncToCalendar,
  };
}
