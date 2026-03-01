import { useState } from "react";
import DOMPurify from "dompurify";
import type { Assignment } from "../types";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import { URGENCY_STYLES, ROW_BG, ROW_HOVER } from "../utils/urgencyStyles";

interface Props {
  assignment: Assignment;
  checked: boolean;
  onToggleChecked: (id: number | string) => void;
}

export function AssignmentRow({ assignment, checked, onToggleChecked }: Props) {
  const [expanded, setExpanded] = useState(false);
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

  return (
    <>
      <tr
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        className={`cursor-pointer border-b border-gray-100 transition-colors ${
          checked ? "opacity-50" : ""
        } ${ROW_BG[assignment.urgency] || ""} ${
          ROW_HOVER[assignment.urgency] || "hover:bg-gray-50"
        }`}
      >
        <td className="px-3 py-3">
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
        </td>
        <td className="px-6 py-3 text-sm text-gray-600">
          {assignment.course_name}
        </td>
        <td className="px-6 py-3 text-sm font-medium text-gray-900">
          <span className={checked ? "line-through text-gray-400" : ""}>
            {assignment.name}
          </span>
        </td>
        <td className="px-6 py-3 text-sm text-gray-600">
          <span className="font-medium">{formatRelativeTime(due)}</span>
          <span className="ml-1 text-gray-400">({dateStr} {timeStr})</span>
        </td>
        <td className="px-6 py-3 text-sm text-gray-600 text-right">
          {assignment.points_possible ?? "\u2014"}
        </td>
        <td className="px-6 py-3">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
              URGENCY_STYLES[assignment.urgency]
            }`}
          >
            {assignment.urgency}
          </span>
        </td>
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
