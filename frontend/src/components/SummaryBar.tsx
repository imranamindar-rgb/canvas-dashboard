import type { Stats } from "../types";

interface Props {
  stats: Stats | null;
}

export function SummaryBar({ stats }: Props) {
  if (!stats) return null;

  return (
    <div className="flex flex-col gap-3 px-4 py-3 border-b border-gray-200 sm:flex-row sm:gap-6 sm:px-6">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-red-600">
          {stats.due_today}
        </span>
        <span className="text-sm text-gray-500">due today</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-orange-600">
          {stats.due_this_week}
        </span>
        <span className="text-sm text-gray-500">due this week</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">
          {stats.total}
        </span>
        <span className="text-sm text-gray-500">total</span>
      </div>
    </div>
  );
}
