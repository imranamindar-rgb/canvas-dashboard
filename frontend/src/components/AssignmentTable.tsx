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

function AssignmentCard({ assignment }: { assignment: Assignment }) {
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
      } ${assignment.submitted ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500">{assignment.course_name}</p>
          <p className="font-medium text-gray-900">
            {assignment.submitted && <span className="mr-1 text-green-600">&#10003;</span>}
            <span className={assignment.submitted ? "line-through text-gray-400" : ""}>
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
}

export function AssignmentTable({ assignments, loading }: Props) {
  if (loading && assignments.length === 0) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
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

  return (
    <div>
      {/* Mobile card view */}
      <div className="block space-y-3 p-4 md:hidden">
        {assignments.map((a) => (
          <AssignmentCard key={a.id} assignment={a} />
        ))}
      </div>
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-6 py-3">Course</th>
              <th className="px-6 py-3">Assignment</th>
              <th className="px-6 py-3">Due</th>
              <th className="px-6 py-3 text-right">Points</th>
              <th className="px-6 py-3">Urgency</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <AssignmentRow key={a.id} assignment={a} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
