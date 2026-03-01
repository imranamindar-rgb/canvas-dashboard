import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Assignment, HealthStatus, Urgency } from "../types";
import { api } from "../utils/api";

const POLL_INTERVAL = 30_000;
const CHECKED_KEY = "canvas-dashboard-checked";

function loadCheckedIds(): Set<number | string> {
  try {
    const raw = localStorage.getItem(CHECKED_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore corrupt data */ }
  return new Set();
}

function saveCheckedIds(ids: Set<number | string>): void {
  localStorage.setItem(CHECKED_KEY, JSON.stringify([...ids]));
}

type ViewFilter = "today" | "week" | null;

export function useAssignments() {
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | null>(null);
  const [courseFilter, setCourseFilter] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("week");
  const [showSubmitted, setShowSubmitted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<number | string>>(loadCheckedIds);
  const [lastCheckedId, setLastCheckedId] = useState<number | string | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const toggleChecked = useCallback((id: number | string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setLastCheckedId(null);
      } else {
        next.add(id);
        setLastCheckedId(id);
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = setTimeout(() => setLastCheckedId(null), 5000);
      }
      saveCheckedIds(next);
      return next;
    });
  }, []);

  const fetchData = useCallback(async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
      setError(null);
      const [data, healthData] = await Promise.all([
        api.get<Assignment[]>("/api/assignments", signal),
        api.get<HealthStatus>("/api/health", signal),
      ]);
      setAllAssignments(data);
      setHealth(healthData);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("Failed to fetch data:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const undoLastCheck = useCallback(() => {
    if (lastCheckedId !== null) {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        next.delete(lastCheckedId);
        saveCheckedIds(next);
        return next;
      });
      setLastCheckedId(null);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    }
  }, [lastCheckedId]);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await api.post("/api/refresh");
      await fetchData();
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  // Apply client-side filters
  const filtered = useMemo(() => {
    let result = showSubmitted
      ? allAssignments
      : allAssignments.filter((a) => !a.submitted && !checkedIds.has(a.id));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.course_name.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q))
      );
    }
    if (urgencyFilter) {
      result = result.filter((a) => a.urgency === urgencyFilter);
    }
    if (courseFilter) {
      result = result.filter((a) => a.course_name === courseFilter);
    }
    if (viewFilter === "today") {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      result = result.filter((a) => new Date(a.due_at) <= endOfToday);
    } else if (viewFilter === "week") {
      const endOfWeek = new Date(Date.now() + 7 * 86_400_000);
      result = result.filter((a) => new Date(a.due_at) <= endOfWeek);
    }
    return result;
  }, [allAssignments, showSubmitted, checkedIds, searchQuery, urgencyFilter, courseFilter, viewFilter]);

  return {
    assignments: filtered,
    health,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    urgencyFilter,
    setUrgencyFilter,
    courseFilter,
    setCourseFilter,
    viewFilter,
    setViewFilter,
    refresh,
    showSubmitted,
    setShowSubmitted,
    checkedIds,
    toggleChecked,
    lastCheckedId,
    undoLastCheck,
  };
}
