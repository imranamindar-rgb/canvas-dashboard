import type { Assignment } from "../types";
import { AssignmentRow } from "./AssignmentRow";

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
          {assignments.map((a) => (
            <AssignmentRow key={a.id} assignment={a} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
