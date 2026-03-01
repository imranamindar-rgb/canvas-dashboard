import { useState, useEffect, useCallback } from "react";
import type { Assignment } from "../types";

interface EmailState {
  authorized: boolean;
  loading: boolean;
  syncing: boolean;
  lastSync: string | null;
  taskCount: number;
  error: string | null;
  lastResult: string | null;
  tasks: Assignment[];
}

export function useEmail() {
  const [state, setState] = useState<EmailState>({
    authorized: false,
    loading: true,
    syncing: false,
    lastSync: null,
    taskCount: 0,
    error: null,
    lastResult: null,
    tasks: [],
  });

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/email/status");
      const data = await res.json();
      setState((s) => ({
        ...s,
        authorized: data.authorized,
        lastSync: data.last_sync,
        taskCount: data.task_count,
        error: data.error,
        loading: false,
      }));
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/email/tasks");
      const data: Assignment[] = await res.json();
      setState((s) => ({ ...s, tasks: data }));
    } catch {
      // tasks will remain stale
    }
  }, []);

  const syncEmail = useCallback(async () => {
    setState((s) => ({ ...s, syncing: true, error: null, lastResult: null }));
    try {
      const res = await fetch("/api/email/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setState((s) => ({ ...s, error: data.error, syncing: false }));
      } else {
        setState((s) => ({
          ...s,
          lastResult: data.message,
          syncing: false,
        }));
        await fetchTasks();
        await checkStatus();
      }
    } catch {
      setState((s) => ({
        ...s,
        error: "Failed to sync email tasks",
        syncing: false,
      }));
    }
  }, [fetchTasks, checkStatus]);

  useEffect(() => {
    checkStatus();
    fetchTasks();
  }, [checkStatus, fetchTasks]);

  return {
    ...state,
    syncEmail,
  };
}
