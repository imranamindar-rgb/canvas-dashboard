import type { Assignment, Stats, Urgency } from "../types";

export function computeStats(assignments: Assignment[]): Stats {
  const active = assignments.filter((a) => !a.submitted);
  const urgencyCounts: Record<Urgency, number> = {
    overdue: 0,
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

  return {
    total: active.length,
    by_urgency: urgencyCounts,
    by_course: courseCounts,
    due_today: dueToday,
    due_this_week: dueThisWeek,
  };
}
