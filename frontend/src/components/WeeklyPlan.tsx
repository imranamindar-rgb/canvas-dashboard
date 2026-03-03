import { useState, useMemo, useCallback } from "react";
import type { Assignment } from "../types";
import { getCourseColor } from "../utils/courseColors";

interface Props {
  assignments: Assignment[];
  onSetPlannedDay: (assignment: Assignment, day: string | null) => Promise<void>;
  onSyncCalendar: () => Promise<void>;
  syncing: boolean;
}

function getWeekDates(offset: number): Date[] {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon + offset * 7);
  mon.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatWeekLabel(dates: Date[]): string {
  const first = dates[0];
  const last = dates[6];
  const firstMonth = first.toLocaleDateString(undefined, { month: "long" });
  const lastMonth = last.toLocaleDateString(undefined, { month: "long" });
  const firstDay = first.getDate();
  const lastDay = last.getDate();
  const year = last.getFullYear();
  if (firstMonth === lastMonth) {
    return `${firstMonth} ${firstDay}–${lastDay}, ${year}`;
  }
  return `${firstMonth} ${firstDay} – ${lastMonth} ${lastDay}, ${year}`;
}

function formatRelativeDay(due: Date, weekDates: Date[]): string {
  const isoDate = toISODate(due);
  const idx = weekDates.findIndex((d) => toISODate(d) === isoDate);
  if (idx >= 0) return `due ${DAY_NAMES[idx]}`;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "due today";
  if (diffDays === 1) return "due tomorrow";
  if (diffDays === -1) return "due yesterday";
  if (diffDays < 0) return `due ${Math.abs(diffDays)}d ago`;
  return `due in ${diffDays}d`;
}

export function WeeklyPlan({ assignments, onSetPlannedDay, onSyncCalendar, syncing }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [overrides, setOverrides] = useState<Map<string | number, string | null>>(new Map());
  const [saving, setSaving] = useState<string | number | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  // Filter: show assignments due within ±14 days of the displayed week
  const relevant = useMemo(() => {
    const rangeStart = new Date(weekStart);
    rangeStart.setDate(weekStart.getDate() - 14);
    const rangeEnd = new Date(weekEnd);
    rangeEnd.setDate(weekEnd.getDate() + 14);
    return assignments.filter((a) => {
      if (!a.due_at) return false;
      const due = new Date(a.due_at);
      return due >= rangeStart && due <= rangeEnd;
    });
  }, [assignments, weekStart, weekEnd]);

  const getEffectivePlannedDay = useCallback((a: Assignment): string | null | undefined => {
    if (overrides.has(a.id)) return overrides.get(a.id);
    return a.planned_day;
  }, [overrides]);

  // Assignments planned for each day of the week
  const byDay = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const d of weekDates) {
      map.set(toISODate(d), []);
    }
    for (const a of relevant) {
      const pd = getEffectivePlannedDay(a);
      if (pd && map.has(pd)) {
        map.get(pd)!.push(a);
      }
    }
    return map;
  }, [relevant, weekDates, overrides, getEffectivePlannedDay]);

  // Assignments due within the week but with no planned_day set for this week
  const unscheduled = useMemo(() => {
    const weekIsos = new Set(weekDates.map(toISODate));
    return relevant.filter((a) => {
      const pd = getEffectivePlannedDay(a);
      // Only show in unscheduled if: no planned_day, or planned_day not in this week
      if (pd && weekIsos.has(pd)) return false;
      // Only show if due within the week or within 7 days after week start
      if (!a.due_at) return false;
      const due = new Date(a.due_at);
      return due >= weekStart && due <= weekEnd;
    });
  }, [relevant, weekDates, weekStart, weekEnd, overrides, getEffectivePlannedDay]);

  const handleSetDay = async (assignment: Assignment, day: string | null) => {
    setSaving(assignment.id);
    // Capture previous value for rollback
    const previousDay = overrides.has(assignment.id)
      ? overrides.get(assignment.id)
      : assignment.planned_day ?? null;
    // Optimistic update
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(assignment.id, day);
      return next;
    });
    try {
      await onSetPlannedDay(assignment, day);
    } catch {
      // Rollback optimistic update
      setOverrides((prev) => {
        const next = new Map(prev);
        next.set(assignment.id, previousDay ?? null);
        return next;
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      {/* Header / week navigation */}
      <div className="mb-4 flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="rounded px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          &larr; Prev Week
        </button>
        <h2 className="text-base font-semibold text-gray-900">
          Week of {formatWeekLabel(weekDates)}
        </h2>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="rounded px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Next Week &rarr;
        </button>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {weekDates.map((date, idx) => {
          const isoDate = toISODate(date);
          const dayAssignments = byDay.get(isoDate) ?? [];
          const isToday = toISODate(date) === toISODate(new Date());
          return (
            <div key={isoDate} className="flex flex-col gap-2">
              <div
                className={`rounded-lg px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide ${
                  isToday
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-500 shadow-sm"
                }`}
              >
                <div>{DAY_NAMES[idx]}</div>
                <div className={`text-base font-bold ${isToday ? "text-white" : "text-gray-800"}`}>
                  {date.getDate()}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 min-h-[80px]">
                {dayAssignments.map((a) => {
                  const color = getCourseColor(a.course_name);
                  const due = a.due_at ? new Date(a.due_at) : null;
                  return (
                    <div
                      key={a.id}
                      className="rounded-md border border-gray-200 bg-white p-2 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span
                          className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs font-medium ${color.bg} ${color.text} ${color.border} border`}
                          title={a.course_name}
                        >
                          {a.course_name.length > 8 ? a.course_name.slice(0, 8) + "…" : a.course_name}
                        </span>
                        <button
                          onClick={() => handleSetDay(a, null)}
                          disabled={saving === a.id}
                          title="Remove from plan"
                          className="text-gray-300 hover:text-gray-500 disabled:opacity-50 text-xs leading-none"
                          aria-label="Remove from plan"
                        >
                          &times;
                        </button>
                      </div>
                      <p className="mt-1 text-xs font-medium text-gray-800 leading-tight line-clamp-2" title={a.name}>
                        {a.name}
                      </p>
                      {due && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          {formatRelativeDay(due, weekDates)}
                        </p>
                      )}
                      {a.effort && (
                        <span className="mt-0.5 inline-flex items-center rounded bg-gray-100 px-1 py-0.5 text-xs font-medium text-gray-600">
                          {a.effort}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unscheduled section */}
      {unscheduled.length > 0 && (
        <div className="rounded-lg bg-white shadow-sm p-4 mb-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Unscheduled — due this week ({unscheduled.length})
          </h3>
          <div className="flex flex-col gap-2">
            {unscheduled.map((a) => {
              const color = getCourseColor(a.course_name);
              const due = a.due_at ? new Date(a.due_at) : null;
              return (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
                >
                  <span
                    className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs font-medium ${color.bg} ${color.text} ${color.border} border`}
                  >
                    {a.course_name}
                  </span>
                  <span className="flex-1 text-sm text-gray-800 font-medium truncate" title={a.name}>
                    {a.name}
                  </span>
                  {due && (
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatRelativeDay(due, weekDates)}
                    </span>
                  )}
                  {a.effort && (
                    <span className="inline-flex items-center rounded bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-600 shrink-0">
                      {a.effort}
                    </span>
                  )}
                  {/* Day selector */}
                  <div className="flex gap-1 shrink-0">
                    {weekDates.map((d, idx) => (
                      <button
                        key={toISODate(d)}
                        onClick={() => handleSetDay(a, toISODate(d))}
                        disabled={saving === a.id}
                        title={`Plan for ${DAY_NAMES[idx]} ${d.getDate()}`}
                        className="rounded px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {DAY_NAMES[idx]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {unscheduled.length === 0 && relevant.length === 0 && (
        <div className="rounded-lg bg-white shadow-sm p-8 text-center text-gray-400">
          <p className="text-sm">No assignments due around this week.</p>
        </div>
      )}

      {unscheduled.length === 0 && relevant.length > 0 && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center text-green-700 text-sm font-medium mb-4">
          All assignments due this week are scheduled!
        </div>
      )}

      {/* Sync to Google Calendar */}
      <div className="flex justify-end">
        <button
          onClick={onSyncCalendar}
          disabled={syncing}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {syncing ? "Syncing..." : "Sync plan to Google Calendar"}
        </button>
      </div>
    </div>
  );
}
