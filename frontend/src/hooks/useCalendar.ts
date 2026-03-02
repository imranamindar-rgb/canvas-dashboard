import { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api";

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
      const data = await api.get<{ authorized: boolean }>("/api/gcal/auth");
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
      const data = await api.post<{ authorized: boolean; error?: string }>("/api/gcal/authorize");
      if (data.authorized) {
        setState((s) => ({ ...s, authorized: true, loading: false }));
      } else {
        setState((s) => ({ ...s, loading: false, error: data.error ?? null }));
      }
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, []);

  const syncToCalendar = useCallback(async () => {
    setState((s) => ({ ...s, syncing: true, error: null, lastResult: null }));
    try {
      const data = await api.post<{ synced?: number; error?: string }>("/api/gcal/sync");
      if (data.error) {
        setState((s) => ({ ...s, syncing: false, error: data.error ?? null }));
      } else {
        setState((s) => ({
          ...s,
          syncing: false,
          lastResult: `Synced ${data.synced} assignments`,
        }));
      }
    } catch (err) {
      setState((s) => ({ ...s, syncing: false, error: (err as Error).message }));
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
