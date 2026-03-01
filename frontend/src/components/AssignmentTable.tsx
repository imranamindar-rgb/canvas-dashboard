import { useState, useMemo } from "react";
import type { Assignment } from "../types";
import { AssignmentRow } from "./AssignmentRow";
import { AssignmentCard } from "./AssignmentCard";

function groupAssignmentsByCourse(assignments: Assignment[]) {
  const map = new Map<string, Assignment[]>();
  for (const a of assignments) {
    const list = map.get(a.course_name) ?? [];
    list.push(a);
    map.set(a.course_name, list);
  }
  return Array.from(map.entries()).map(([courseName, items]) => ({
    courseName,
    items,
  }));
}

function groupAssignmentsBySource(assignments: Assignment[]) {
  const canvas = assignments.filter((a) => a.source !== "email");
  const email = assignments.filter((a) => a.source === "email");
  const groups: { label: string; items: Assignment[] }[] = [];
  if (canvas.length > 0) groups.push({ label: "Canvas", items: canvas });
  if (email.length > 0) groups.push({ label: "Email", items: email });
  return groups;
}

interface Props {
  assignments: Assignment[];
  loading: boolean;
  checkedIds: Set<number | string>;
  onToggleChecked: (id: number | string) => void;
  groupByCourse: boolean;
  groupBySource: boolean;
  hasActiveFilters?: boolean;
  searchQuery?: string;
}

export function AssignmentTable({ assignments, loading, checkedIds, onToggleChecked, groupByCourse, groupBySource, hasActiveFilters, searchQuery }: Props) {
  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<"course" | "name" | "due" | "points" | "urgency">("due");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const toggleCourseCollapse = (name: string) => {
    setCollapsedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sorted = useMemo(() => {
    const copy = [...assignments];
    const urgencyOrder: Record<string, number> = { overdue: 0, critical: 1, high: 2, medium: 3, runway: 4 };
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "course": cmp = a.course_name.localeCompare(b.course_name); break;
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "due": cmp = new Date(a.due_at).getTime() - new Date(b.due_at).getTime(); break;
        case "points": cmp = (a.points_possible ?? 0) - (b.points_possible ?? 0); break;
        case "urgency": cmp = (urgencyOrder[a.urgency] ?? 5) - (urgencyOrder[b.urgency] ?? 5); break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [assignments, sortKey, sortDirection]);

  if (loading && assignments.length === 0) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="w-10 px-3 py-3"></th>
              <th className="px-6 py-3">Course</th>
              <th className="px-6 py-3">Assignment</th>
              <th className="px-6 py-3">Due</th>
              <th className="px-6 py-3 text-right">Points</th>
              <th className="px-6 py-3">Urgency</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-100 animate-pulse">
                <td className="px-3 py-3"><div className="h-5 w-5 rounded bg-gray-200" /></td>
                <td className="px-6 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                <td className="px-6 py-3"><div className="h-4 w-40 rounded bg-gray-200" /></td>
                <td className="px-6 py-3"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                <td className="px-6 py-3 text-right"><div className="ml-auto h-4 w-8 rounded bg-gray-200" /></td>
                <td className="px-6 py-3"><div className="h-5 w-16 rounded-full bg-gray-200" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        {searchQuery ? (
          <>
            <p className="text-lg font-medium text-gray-500">No results for &ldquo;{searchQuery}&rdquo;</p>
            <p className="mt-1 text-sm">Try a different search term</p>
          </>
        ) : hasActiveFilters ? (
          <>
            <p className="text-lg font-medium text-gray-500">No assignments match your filters</p>
            <p className="mt-1 text-sm">Try removing some filters</p>
          </>
        ) : (
          <>
            <p className="text-lg font-medium text-gray-500">You&rsquo;re all caught up!</p>
            <p className="mt-1 text-sm">No upcoming assignments</p>
          </>
        )}
      </div>
    );
  }

  const groups = groupByCourse ? groupAssignmentsByCourse(sorted) : null;
  const sourceGroups = groupBySource ? groupAssignmentsBySource(sorted) : null;

  const renderDesktopRows = () => {
    if (groups) {
      return groups.map(({ courseName, items }) => (
        <tbody key={courseName}>
          <tr
            onClick={() => toggleCourseCollapse(courseName)}
            className="cursor-pointer bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <td colSpan={6} className="px-6 py-3">
              <div className="flex items-center gap-2">
                <svg
                  className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                    collapsedCourses.has(courseName) ? "" : "rotate-90"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-sm font-semibold text-gray-700">{courseName}</span>
                <span className="text-xs text-gray-400">
                  ({items.length} assignment{items.length !== 1 ? "s" : ""})
                </span>
              </div>
            </td>
          </tr>
          {!collapsedCourses.has(courseName) &&
            items.map((a) => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                checked={a.submitted || checkedIds.has(a.id)}
                onToggleChecked={onToggleChecked}
              />
            ))}
        </tbody>
      ));
    } else if (sourceGroups) {
      return sourceGroups.map(({ label, items }) => (
        <tbody key={label}>
          <tr
            onClick={() => toggleCourseCollapse(label)}
            className={`cursor-pointer transition-colors ${
              label === "Email" ? "bg-purple-50 hover:bg-purple-100" : "bg-blue-50 hover:bg-blue-100"
            }`}
          >
            <td colSpan={6} className="px-6 py-3">
              <div className="flex items-center gap-2">
                <svg
                  className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                    collapsedCourses.has(label) ? "" : "rotate-90"
                  }`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className={`text-sm font-semibold ${
                  label === "Email" ? "text-purple-700" : "text-blue-700"
                }`}>{label}</span>
                <span className="text-xs text-gray-400">
                  ({items.length} item{items.length !== 1 ? "s" : ""})
                </span>
              </div>
            </td>
          </tr>
          {!collapsedCourses.has(label) &&
            items.map((a) => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                checked={a.submitted || checkedIds.has(a.id)}
                onToggleChecked={onToggleChecked}
              />
            ))}
        </tbody>
      ));
    }
    return (
      <tbody>
        {sorted.map((a) => (
          <AssignmentRow
            key={a.id}
            assignment={a}
            checked={a.submitted || checkedIds.has(a.id)}
            onToggleChecked={onToggleChecked}
          />
        ))}
      </tbody>
    );
  };

  const renderMobileCards = () => {
    if (groups) {
      return groups.map(({ courseName, items }) => (
        <div key={courseName}>
          <button
            onClick={() => toggleCourseCollapse(courseName)}
            className="flex w-full items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 mb-2 transition-colors hover:bg-gray-200"
          >
            <svg
              className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                collapsedCourses.has(courseName) ? "" : "rotate-90"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">{courseName}</span>
            <span className="text-xs text-gray-400">({items.length})</span>
          </button>
          {!collapsedCourses.has(courseName) && (
            <div className="space-y-3 mb-4">
              {items.map((a) => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  checked={a.submitted || checkedIds.has(a.id)}
                  onToggleChecked={onToggleChecked}
                />
              ))}
            </div>
          )}
        </div>
      ));
    } else if (sourceGroups) {
      return sourceGroups.map(({ label, items }) => (
        <div key={label}>
          <button
            onClick={() => toggleCourseCollapse(label)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 mb-2 transition-colors ${
              label === "Email" ? "bg-purple-50 hover:bg-purple-100" : "bg-blue-50 hover:bg-blue-100"
            }`}
          >
            <svg
              className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                collapsedCourses.has(label) ? "" : "rotate-90"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className={`text-sm font-semibold ${
              label === "Email" ? "text-purple-700" : "text-blue-700"
            }`}>{label}</span>
            <span className="text-xs text-gray-400">({items.length})</span>
          </button>
          {!collapsedCourses.has(label) && (
            <div className="space-y-3 mb-4">
              {items.map((a) => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  checked={a.submitted || checkedIds.has(a.id)}
                  onToggleChecked={onToggleChecked}
                />
              ))}
            </div>
          )}
        </div>
      ));
    }
    return sorted.map((a) => (
      <AssignmentCard
        key={a.id}
        assignment={a}
        checked={a.submitted || checkedIds.has(a.id)}
        onToggleChecked={onToggleChecked}
      />
    ));
  };

  return (
    <div>
      {/* Mobile card view */}
      <div className="block space-y-3 p-4 md:hidden">
        {renderMobileCards()}
      </div>
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="w-10 px-3 py-3"></th>
              <th className="px-6 py-3 cursor-pointer select-none" onClick={() => handleSort("course")}>
                <div className="flex items-center gap-1">
                  Course {sortKey === "course" && (sortDirection === "asc" ? "\u2191" : "\u2193")}
                </div>
              </th>
              <th className="px-6 py-3 cursor-pointer select-none" onClick={() => handleSort("name")}>
                <div className="flex items-center gap-1">
                  Assignment {sortKey === "name" && (sortDirection === "asc" ? "\u2191" : "\u2193")}
                </div>
              </th>
              <th className="px-6 py-3 cursor-pointer select-none" onClick={() => handleSort("due")}>
                <div className="flex items-center gap-1">
                  Due {sortKey === "due" && (sortDirection === "asc" ? "\u2191" : "\u2193")}
                </div>
              </th>
              <th className="px-6 py-3 text-right cursor-pointer select-none" onClick={() => handleSort("points")}>
                <div className="flex items-center justify-end gap-1">
                  Points {sortKey === "points" && (sortDirection === "asc" ? "\u2191" : "\u2193")}
                </div>
              </th>
              <th className="px-6 py-3 cursor-pointer select-none" onClick={() => handleSort("urgency")}>
                <div className="flex items-center gap-1">
                  Urgency {sortKey === "urgency" && (sortDirection === "asc" ? "\u2191" : "\u2193")}
                </div>
              </th>
            </tr>
          </thead>
          {renderDesktopRows()}
        </table>
      </div>
    </div>
  );
}
