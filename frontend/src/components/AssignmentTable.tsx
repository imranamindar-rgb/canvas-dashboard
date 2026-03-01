import { useState } from "react";
import DOMPurify from "dompurify";
import type { Assignment } from "../types";
import { AssignmentRow } from "./AssignmentRow";

const URGENCY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-blue-100 text-blue-800",
  runway: "bg-green-100 text-green-800",
};

const CARD_BG: Record<string, string> = {
  critical: "bg-red-50 border-red-200",
  high: "bg-orange-50 border-orange-200",
  medium: "bg-white border-gray-200",
  runway: "bg-white border-gray-200",
};

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

function AssignmentCard({
  assignment,
  checked,
  onToggleChecked,
}: {
  assignment: Assignment;
  checked: boolean;
  onToggleChecked: (id: number | string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const due = new Date(assignment.due_at);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const isPast = diffMs < 0;
  const abs = Math.abs(diffMs);
  const hours = Math.floor(abs / 3_600_000);
  const days = Math.floor(abs / 86_400_000);
  let relative: string;
  if (days === 1) relative = isPast ? "yesterday" : "tomorrow";
  else if (days > 1) relative = isPast ? `${days}d ago` : `in ${days}d`;
  else if (hours >= 1) relative = isPast ? `${hours}h ago` : `in ${hours}h`;
  else relative = isPast ? `${Math.floor(abs / 60_000)}m ago` : `in ${Math.floor(abs / 60_000)}m`;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className={`cursor-pointer rounded-lg border p-4 transition-colors ${
        CARD_BG[assignment.urgency] || "bg-white border-gray-200"
      } ${checked ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleChecked(assignment.id); }}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all duration-200 ${
            checked
              ? "border-green-500 bg-green-500 text-white"
              : "border-gray-300 hover:border-gray-400"
          }`}
          aria-label={checked ? "Mark as not done" : "Mark as done"}
        >
          {checked && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500">{assignment.course_name}</p>
              <p className="font-medium text-gray-900">
                <span className={checked ? "line-through text-gray-400" : ""}>
                  {assignment.name}
                </span>
              </p>
            </div>
            <span
              className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                URGENCY_STYLES[assignment.urgency]
              }`}
            >
              {assignment.urgency}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
            <span className="font-medium">{relative}</span>
            <span>{assignment.points_possible ?? "\u2014"} pts</span>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 border-t pt-3">
          {assignment.description ? (
            <div
              className="text-sm text-gray-700"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(assignment.description),
              }}
            />
          ) : (
            <p className="text-sm italic text-gray-400">No description</p>
          )}
          <a
            href={assignment.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-sm font-medium text-blue-600 hover:text-blue-800"
            onClick={(e) => e.stopPropagation()}
          >
            Open in Canvas &rarr;
          </a>
        </div>
      )}
    </div>
  );
}

interface Props {
  assignments: Assignment[];
  loading: boolean;
  checkedIds: Set<number | string>;
  onToggleChecked: (id: number | string) => void;
  groupByCourse: boolean;
  groupBySource: boolean;
}

export function AssignmentTable({ assignments, loading, checkedIds, onToggleChecked, groupByCourse, groupBySource }: Props) {
  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set());

  const toggleCourseCollapse = (name: string) => {
    setCollapsedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

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
      <div className="flex items-center justify-center py-20 text-gray-400">
        No assignments found
      </div>
    );
  }

  const groups = groupByCourse ? groupAssignmentsByCourse(assignments) : null;
  const sourceGroups = groupBySource ? groupAssignmentsBySource(assignments) : null;

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
        {assignments.map((a) => (
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
    return assignments.map((a) => (
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
              <th className="px-6 py-3">Course</th>
              <th className="px-6 py-3">Assignment</th>
              <th className="px-6 py-3">Due</th>
              <th className="px-6 py-3 text-right">Points</th>
              <th className="px-6 py-3">Urgency</th>
            </tr>
          </thead>
          {renderDesktopRows()}
        </table>
      </div>
    </div>
  );
}
