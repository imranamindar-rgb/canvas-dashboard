import { useState, useMemo, useCallback } from "react";
import type { Assignment } from "../types";
import { getCourseColor } from "../utils/courseColors";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  assignments: Assignment[];
  onSetPlannedDay: (assignment: Assignment, day: string | null) => Promise<void>;
  onSyncCalendar: () => Promise<void>;
  syncing: boolean;
  viewFilter?: "today" | "week" | null;
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

function formatDateRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString(undefined, { month: "short" });
  const endMonth = end.toLocaleDateString(undefined, { month: "short" });
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()}–${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
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

function DraggableCard({ assignment, weekDates }: { assignment: Assignment; weekDates: Date[] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(assignment.id),
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  };
  const color = getCourseColor(assignment.course_name);
  const due = assignment.due_at ? new Date(assignment.due_at) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 shadow-sm cursor-grab active:cursor-grabbing touch-none"
    >
      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${color.bg} ${color.text} ${color.border} border`}>
        {assignment.course_name.length > 8 ? assignment.course_name.slice(0, 8) + "…" : assignment.course_name}
      </span>
      <p className="mt-1 text-xs font-medium text-gray-800 dark:text-zinc-200 leading-tight line-clamp-2" title={assignment.name}>
        {assignment.name}
      </p>
      {due && (
        <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
          {formatRelativeDay(due, weekDates)}
        </p>
      )}
      {assignment.effort && (
        <span className="mt-0.5 inline-flex items-center rounded bg-gray-100 dark:bg-zinc-700 px-1 py-0.5 text-xs font-medium text-gray-600 dark:text-zinc-400">
          {assignment.effort}
        </span>
      )}
    </div>
  );
}

function DayColumn({ isoDate, dayName, dateNum, isToday, assignments, weekDates }: {
  isoDate: string; dayName: string; dateNum: number; isToday: boolean;
  assignments: Assignment[]; weekDates: Date[];
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `day-${isoDate}` });

  return (
    <div className="flex flex-col gap-2">
      <div className={`rounded-lg px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide ${
        isToday ? "bg-indigo-600 text-white" : "bg-white dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 shadow-sm"
      }`}>
        <div>{dayName}</div>
        <div className={`text-base font-bold ${isToday ? "text-white" : "text-gray-800 dark:text-zinc-200"}`}>
          {dateNum}
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-1.5 min-h-[80px] rounded-lg border-2 border-dashed p-1 transition-colors ${
          isOver ? "border-indigo-400 bg-indigo-500/5" : "border-transparent"
        }`}
      >
        {assignments.map((a) => (
          <DraggableCard key={a.id} assignment={a} weekDates={weekDates} />
        ))}
      </div>
    </div>
  );
}

function UnscheduledSection({ id, title, dateRange, count, assignments, weekDates }: {
  id: string; title: string; dateRange: string; count: number;
  assignments: Assignment[]; weekDates: Date[];
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  if (assignments.length === 0) return null;

  return (
    <div className={`rounded-lg bg-white dark:bg-zinc-900 shadow-sm p-4 mb-4 transition-colors ${
      isOver ? "ring-2 ring-indigo-400" : ""
    }`}>
      <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wide">
        {title} <span className="normal-case font-normal text-gray-400 dark:text-zinc-500">({dateRange})</span> ({count})
      </h3>
      <div ref={setNodeRef} className="flex flex-col gap-2 min-h-[40px]">
        {assignments.map((a) => (
          <DraggableCard key={a.id} assignment={a} weekDates={weekDates} />
        ))}
      </div>
    </div>
  );
}

export function WeeklyPlan({ assignments, onSetPlannedDay, onSyncCalendar, syncing, viewFilter }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [overrides, setOverrides] = useState<Map<string | number, string | null>>(new Map());
  const [saving, setSaving] = useState<string | number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  const nextWeekDates = useMemo(() => getWeekDates(weekOffset + 1), [weekOffset]);
  const nextWeekStart = nextWeekDates[0];
  const nextWeekEnd = nextWeekDates[6];
  const week3Dates = useMemo(() => getWeekDates(weekOffset + 2), [weekOffset]);
  const week3Start = week3Dates[0];
  const week3End = week3Dates[6];
  const week4Dates = useMemo(() => getWeekDates(weekOffset + 3), [weekOffset]);
  const week4Start = week4Dates[0];
  const week4End = week4Dates[6];
  const todayIso = toISODate(new Date());
  const showAllWeeks = viewFilter === null; // "All" filter

  // Filter: show assignments due within range of displayed weeks
  const relevant = useMemo(() => {
    const rangeStart = new Date(weekStart);
    rangeStart.setDate(weekStart.getDate() - 14);
    const rangeEnd = new Date(showAllWeeks ? week4End : weekEnd);
    rangeEnd.setDate(rangeEnd.getDate() + 14);
    return assignments.filter((a) => {
      if (!a.due_at) return false;
      const due = new Date(a.due_at);
      return due >= rangeStart && due <= rangeEnd;
    });
  }, [assignments, weekStart, weekEnd, week4End, showAllWeeks]);

  const activeAssignment = useMemo(
    () => activeId ? relevant.find(a => String(a.id) === activeId) ?? null : null,
    [activeId, relevant]
  );

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

  // Unscheduled assignments due this week
  const unscheduledThisWeek = useMemo(() => {
    const weekIsos = new Set(weekDates.map(toISODate));
    return relevant.filter((a) => {
      const pd = getEffectivePlannedDay(a);
      if (pd && weekIsos.has(pd)) return false;
      if (!a.due_at) return false;
      const due = new Date(a.due_at);
      return due >= weekStart && due <= weekEnd;
    });
  }, [relevant, weekDates, weekStart, weekEnd, overrides, getEffectivePlannedDay]);

  // Unscheduled assignments due next week
  const unscheduledNextWeek = useMemo(() => {
    const weekIsos = new Set(weekDates.map(toISODate));
    return assignments.filter((a) => {
      if (!a.due_at) return false;
      const pd = getEffectivePlannedDay(a);
      if (pd && weekIsos.has(pd)) return false;
      const due = new Date(a.due_at);
      return due >= nextWeekStart && due <= nextWeekEnd;
    });
  }, [assignments, weekDates, nextWeekStart, nextWeekEnd, overrides, getEffectivePlannedDay]);

  // Unscheduled assignments due week 3 (only when "All")
  const unscheduledWeek3 = useMemo(() => {
    if (!showAllWeeks) return [];
    const allIsos = new Set([...weekDates, ...nextWeekDates, ...week3Dates].map(toISODate));
    return assignments.filter((a) => {
      if (!a.due_at) return false;
      const pd = getEffectivePlannedDay(a);
      if (pd && allIsos.has(pd)) return false;
      const due = new Date(a.due_at);
      return due >= week3Start && due <= week3End;
    });
  }, [assignments, weekDates, nextWeekDates, week3Dates, week3Start, week3End, showAllWeeks, overrides, getEffectivePlannedDay]);

  // Unscheduled assignments due week 4 (only when "All")
  const unscheduledWeek4 = useMemo(() => {
    if (!showAllWeeks) return [];
    const allIsos = new Set([...weekDates, ...nextWeekDates, ...week3Dates, ...week4Dates].map(toISODate));
    return assignments.filter((a) => {
      if (!a.due_at) return false;
      const pd = getEffectivePlannedDay(a);
      if (pd && allIsos.has(pd)) return false;
      const due = new Date(a.due_at);
      return due >= week4Start && due <= week4End;
    });
  }, [assignments, weekDates, nextWeekDates, week3Dates, week4Dates, week4Start, week4End, showAllWeeks, overrides, getEffectivePlannedDay]);

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

  // Suppress unused variable warning for saving (used in handleSetDay)
  void saving;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const assignment = relevant.find(a => String(a.id) === String(active.id));
    if (!assignment) return;
    const overId = String(over.id);
    if (overId.startsWith("day-")) {
      handleSetDay(assignment, overId.replace("day-", ""));
    } else if (overId.startsWith("unscheduled")) {
      handleSetDay(assignment, null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      {/* Week navigation */}
      <div className="mb-4 flex items-center justify-between rounded-lg bg-white dark:bg-zinc-900 px-4 py-3 shadow-sm">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="rounded px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
        >
          &larr; Prev Week
        </button>
        <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
          Week of {formatWeekLabel(weekDates)}
        </h2>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="rounded px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Next Week &rarr;
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Day columns grid */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {weekDates.map((date, idx) => {
            const isoDate = toISODate(date);
            return (
              <DayColumn
                key={isoDate}
                isoDate={isoDate}
                dayName={DAY_NAMES[idx]}
                dateNum={date.getDate()}
                isToday={isoDate === todayIso}
                assignments={byDay.get(isoDate) ?? []}
                weekDates={weekDates}
              />
            );
          })}
        </div>

        {/* Unscheduled sections */}
        <UnscheduledSection
          id="unscheduled-this-week"
          title="Unscheduled — due this week"
          dateRange={formatDateRange(weekStart, weekEnd)}
          count={unscheduledThisWeek.length}
          assignments={unscheduledThisWeek}
          weekDates={weekDates}
        />

        {unscheduledThisWeek.length === 0 && relevant.length > 0 && (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 p-4 text-center text-green-700 dark:text-green-400 text-sm font-medium mb-4">
            All assignments due this week are scheduled!
          </div>
        )}

        <UnscheduledSection
          id="unscheduled-next-week"
          title="Unscheduled — due next week"
          dateRange={formatDateRange(nextWeekStart, nextWeekEnd)}
          count={unscheduledNextWeek.length}
          assignments={unscheduledNextWeek}
          weekDates={weekDates}
        />

        {showAllWeeks && (
          <>
            <UnscheduledSection
              id="unscheduled-week-3"
              title="Unscheduled — due in 2 weeks"
              dateRange={formatDateRange(week3Start, week3End)}
              count={unscheduledWeek3.length}
              assignments={unscheduledWeek3}
              weekDates={weekDates}
            />
            <UnscheduledSection
              id="unscheduled-week-4"
              title="Unscheduled — due in 3 weeks"
              dateRange={formatDateRange(week4Start, week4End)}
              count={unscheduledWeek4.length}
              assignments={unscheduledWeek4}
              weekDates={weekDates}
            />
          </>
        )}

        {unscheduledThisWeek.length === 0 && unscheduledNextWeek.length === 0 && relevant.length === 0 && (
          <div className="rounded-lg bg-white dark:bg-zinc-900 shadow-sm p-8 text-center text-gray-400 dark:text-zinc-500">
            <p className="text-sm">No assignments due around this week.</p>
          </div>
        )}

        {/* Drag overlay */}
        <DragOverlay>
          {activeAssignment ? (
            <div className="rounded-md border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-zinc-800 p-2 shadow-lg opacity-80 rotate-2 w-40">
              <p className="text-xs font-medium text-gray-800 dark:text-zinc-200 line-clamp-2">
                {activeAssignment.name}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Sync button */}
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
