import type { Stats } from "../types";

interface Props {
  stats: Stats | null;
}

export function SummaryBar({ stats }: Props) {
  if (!stats) {
    return (
      <div className="flex gap-6 border-b border-gray-200 px-4 py-3 sm:px-6 animate-pulse">
        <div className="h-10 w-24 rounded bg-gray-200" />
        <div className="h-10 w-28 rounded bg-gray-200" />
        <div className="h-10 w-20 rounded bg-gray-200" />
      </div>
    );
  }

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
