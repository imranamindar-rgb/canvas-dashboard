import { useState } from "react";
import type { Assignment } from "../types";

const URGENCY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-blue-100 text-blue-800",
  runway: "bg-green-100 text-green-800",
};

interface Props {
  assignment: Assignment;
}

export function AssignmentRow({ assignment }: Props) {
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
        onClick={() => setExpanded(!expanded)}
        className="cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors"
      >
        <td className="px-6 py-3 text-sm text-gray-600">
          {assignment.course_name}
        </td>
        <td className="px-6 py-3 text-sm font-medium text-gray-900">
          {assignment.name}
        </td>
        <td className="px-6 py-3 text-sm text-gray-600">
          {dateStr} {timeStr}
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
          <td colSpan={5} className="px-6 py-4">
            <div className="mb-2 text-sm text-gray-700">
              {assignment.description ? (
                <div dangerouslySetInnerHTML={{ __html: assignment.description }} />
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
