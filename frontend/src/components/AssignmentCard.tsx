import { useState } from "react";
import DOMPurify from "dompurify";
import type { Assignment } from "../types";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import { URGENCY_STYLES, CARD_BG } from "../utils/urgencyStyles";

interface Props {
  assignment: Assignment;
  checked: boolean;
  onToggleChecked: (id: number | string) => void;
}

export function AssignmentCard({ assignment, checked, onToggleChecked }: Props) {
  const [expanded, setExpanded] = useState(false);
  const due = new Date(assignment.due_at);
  const relative = formatRelativeTime(due);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={() => setExpanded(!expanded)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpanded(!expanded);
        }
      }}
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
