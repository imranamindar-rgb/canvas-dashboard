import type { Assignment } from "../types";
import { AssignmentRow } from "./AssignmentRow";

interface Props {
  assignments: Assignment[];
  loading: boolean;
}

export function AssignmentTable({ assignments, loading }: Props) {
  if (loading && assignments.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Loading assignments...
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
