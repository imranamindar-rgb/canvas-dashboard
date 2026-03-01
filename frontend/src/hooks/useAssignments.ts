import { useState, useEffect, useCallback } from "react";
import type { Assignment, Stats, HealthStatus, Urgency } from "../types";

const POLL_INTERVAL = 30_000;

type ViewFilter = "today" | "week" | null;

export function useAssignments() {
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | null>(null);
  const [courseFilter, setCourseFilter] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>(null);
  const [showSubmitted, setShowSubmitted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [assignRes, healthRes] = await Promise.all([
        fetch("/api/assignments"),
        fetch("/api/health"),
      ]);

      const data: Assignment[] = await assignRes.json();
      setAllAssignments(data);
      setHealth(await healthRes.json());

      // Compute stats client-side from active (non-submitted) assignments
      const active = data.filter((a) => !a.submitted);
      const urgencyCounts: Record<Urgency, number> = {
        critical: 0,
        high: 0,
        medium: 0,
        runway: 0,
      };
      const courseCounts: Record<string, number> = {};
      const now = new Date();
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);
      const endOfWeek = new Date(now.getTime() + 7 * 86_400_000);
      let dueToday = 0;
      let dueThisWeek = 0;

      for (const a of active) {
        urgencyCounts[a.urgency]++;
        courseCounts[a.course_name] = (courseCounts[a.course_name] || 0) + 1;
        const due = new Date(a.due_at);
        if (due <= endOfToday) dueToday++;
        if (due <= endOfWeek) dueThisWeek++;
      }

      setStats({
        total: active.length,
        by_urgency: urgencyCounts,
        by_course: courseCounts,
        due_today: dueToday,
        due_this_week: dueThisWeek,
      });
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/refresh", { method: "POST" });
      await fetchData();
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  // Apply client-side filters
  let filtered = showSubmitted
    ? allAssignments
    : allAssignments.filter((a) => !a.submitted);

  if (urgencyFilter) {
    filtered = filtered.filter((a) => a.urgency === urgencyFilter);
  }
  if (courseFilter) {
    filtered = filtered.filter((a) => a.course_name === courseFilter);
  }
  if (viewFilter === "today") {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    filtered = filtered.filter((a) => new Date(a.due_at) <= endOfToday);
  } else if (viewFilter === "week") {
    const endOfWeek = new Date(Date.now() + 7 * 86_400_000);
    filtered = filtered.filter((a) => new Date(a.due_at) <= endOfWeek);
  }

  return {
    assignments: filtered,
    stats,
    health,
    loading,
    urgencyFilter,
    setUrgencyFilter,
    courseFilter,
    setCourseFilter,
    viewFilter,
    setViewFilter,
    refresh,
    showSubmitted,
    setShowSubmitted,
  };
}
