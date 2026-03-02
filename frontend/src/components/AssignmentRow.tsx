import { useState } from "react";
import DOMPurify from "dompurify";
import type { Assignment } from "../types";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import { URGENCY_STYLES, ROW_BG, ROW_HOVER } from "../utils/urgencyStyles";
import { getCourseColor } from "../utils/courseColors";

interface Props {
  assignment: Assignment;
  checked: boolean;
  onToggleChecked: (id: number | string) => void;
  focusedId?: string | number | null;
  expandedIds?: Set<string | number>;
  onToggleExpand?: (id: string | number) => void;
  showEffort?: boolean;
}

export function AssignmentRow({ assignment, checked, onToggleChecked, focusedId, expandedIds, onToggleExpand, showEffort }: Props) {
  const [localExpanded, setLocalExpanded] = useState(false);
  // Use controlled expandedIds if provided, otherwise fall back to local state
  const expanded = expandedIds !== undefined ? expandedIds.has(assignment.id) : localExpanded;
  const isFocused = focusedId !== undefined && focusedId !== null && focusedId === assignment.id;

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand(assignment.id);
    } else {
      setLocalExpanded((prev) => !prev);
    }
  };
  const due = new Date(assignment.due_at);
  const dateStr = due.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = due.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const courseColor = getCourseColor(assignment.course_name);

  return (
    <>
      <tr
        tabIndex={0}
        onClick={handleToggleExpand}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggleExpand();
          }
        }}
        className={`cursor-pointer border-b border-gray-100 transition-colors ${
          checked ? "opacity-50" : ""
        } ${ROW_BG[assignment.urgency] || ""} ${
          ROW_HOVER[assignment.urgency] || "hover:bg-gray-50"
        }${isFocused ? " ring-2 ring-inset ring-indigo-500" : ""}`}
      >
        <td className="px-3 py-3">
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleChecked(assignment.id); }}
              className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all duration-200 ${
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
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleExpand(); }}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse assignment" : "Expand assignment"}
              className="flex h-4 w-4 items-center justify-center text-gray-400 hover:text-gray-600"
            >
              <svg
                className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </td>
        <td className="px-6 py-3 text-sm text-gray-600">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${courseColor.bg} ${courseColor.text} ${courseColor.border}`}>
            {assignment.course_name}
          </span>
        </td>
        <td className="px-6 py-3">
          <div className="flex flex-col gap-0.5">
            <span className={`text-sm font-medium ${checked ? "line-through text-gray-400" : "text-gray-900"}`}>
              {assignment.name}
            </span>
            {assignment.next_action && (
              <span className="text-xs text-gray-500 truncate max-w-xs">
                &rarr; {assignment.next_action}
              </span>
            )}
          </div>
        </td>
        <td className="px-6 py-3 text-sm text-gray-600">
          <span className="font-medium">{formatRelativeTime(due)}</span>
          <span className="ml-1 text-gray-400">({dateStr} {timeStr})</span>
        </td>
        <td className="px-6 py-3 text-sm text-gray-600 text-right">
          {assignment.points_possible ?? "\u2014"}
        </td>
        {showEffort ? (
          <td className="px-3 py-3 text-center">
            {assignment.effort ? (
              <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700">
                {assignment.effort}
              </span>
            ) : (
              <span className="text-xs text-gray-300">&mdash;</span>
            )}
          </td>
        ) : (
          <td className="px-6 py-3">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                URGENCY_STYLES[assignment.urgency]
              }`}
            >
              {assignment.urgency}
            </span>
          </td>
        )}
      </tr>
      {expanded && (
        <tr className="border-b border-gray-100 bg-gray-50">
          <td colSpan={6} className="px-6 py-4">
            <div className="mb-2 text-sm text-gray-700">
              {assignment.description ? (
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(assignment.description) }} />
              ) : (
                <p className="italic text-gray-400">No description</p>
              )}
            </div>
            <a
              href={assignment.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Open in Canvas &rarr;
            </a>
          </td>
        </tr>
      )}
    </>
  );
}
