import { useState, useEffect, useCallback } from "react";
import type { Assignment } from "../types";
import { api } from "../utils/api";

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
      const data = await api.get<{
        authorized: boolean;
        last_sync: string | null;
        task_count: number;
        error: string | null;
      }>("/api/email/status");
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
      const data = await api.get<Assignment[]>("/api/email/tasks");
      setState((s) => ({ ...s, tasks: data }));
    } catch {
      // tasks will remain stale
    }
  }, []);

  const syncEmail = useCallback(async () => {
    setState((s) => ({ ...s, syncing: true, error: null, lastResult: null }));
    try {
      const data = await api.post<{ message?: string; error?: string }>("/api/email/sync");
      if (data.error) {
        setState((s) => ({ ...s, error: data.error ?? null, syncing: false }));
      } else {
        setState((s) => ({
          ...s,
          lastResult: data.message ?? null,
          syncing: false,
        }));
        await fetchTasks();
        await checkStatus();
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        error: (err as Error).message,
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
