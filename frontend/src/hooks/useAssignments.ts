import { useState, useEffect, useCallback } from "react";
import type { Assignment, Stats, HealthStatus, Urgency } from "../types";

const POLL_INTERVAL = 30_000;

export function useAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | null>(null);
  const [courseFilter, setCourseFilter] = useState<string | null>(null);
  const [showSubmitted, setShowSubmitted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (urgencyFilter) params.set("urgency", urgencyFilter);
      if (courseFilter) params.set("course", courseFilter);
      const qs = params.toString();

      const [assignRes, statsRes, healthRes] = await Promise.all([
        fetch(`/api/assignments${qs ? `?${qs}` : ""}`),
        fetch("/api/stats"),
        fetch("/api/health"),
      ]);

      setAssignments(await assignRes.json());
      setStats(await statsRes.json());
      setHealth(await healthRes.json());
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, [urgencyFilter, courseFilter]);

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

  const filteredAssignments = showSubmitted
    ? assignments
    : assignments.filter((a) => !a.submitted);

  return {
    assignments: filteredAssignments,
    stats,
    health,
    loading,
    urgencyFilter,
    setUrgencyFilter,
    courseFilter,
    setCourseFilter,
    refresh,
    showSubmitted,
    setShowSubmitted,
  };
}
