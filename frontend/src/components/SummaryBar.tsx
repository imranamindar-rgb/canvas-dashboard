import type { Stats } from "../types";

interface Props {
  stats: Stats | null;
}

export function SummaryBar({ stats }: Props) {
  if (!stats) {
    return (
      <div className="flex gap-3 px-4 py-3 sm:px-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  const metrics = [
    { value: stats.due_today, label: "Due Today", accent: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/10" },
    { value: stats.due_this_week, label: "This Week", accent: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/10" },
    { value: stats.total, label: "Total", accent: "text-zinc-900 dark:text-zinc-100", bg: "bg-gray-50 dark:bg-zinc-800/50" },
  ];

  return (
    <div className="flex gap-3 px-4 py-3 sm:px-6">
      {metrics.map(({ value, label, accent, bg }) => (
        <div
          key={label}
          className={`flex flex-col rounded-lg px-4 py-2.5 ${bg}`}
        >
          <span className={`text-2xl font-bold tabular-nums ${accent}`}>
            {value}
          </span>
          <span className="text-xs text-gray-500 dark:text-zinc-500">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
