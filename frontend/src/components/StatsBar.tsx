import type { Stats, Urgency } from "../types";

const TIERS: { key: Urgency; label: string; color: string; activeColor: string }[] = [
  { key: "overdue", label: "Overdue", color: "bg-gray-200 text-gray-600", activeColor: "bg-gray-700 text-white" },
  { key: "critical", label: "Critical", color: "bg-red-100 text-red-800", activeColor: "bg-red-600 text-white" },
  { key: "high", label: "High", color: "bg-orange-100 text-orange-800", activeColor: "bg-orange-500 text-white" },
  { key: "medium", label: "Medium", color: "bg-blue-100 text-blue-800", activeColor: "bg-blue-600 text-white" },
  { key: "runway", label: "Runway", color: "bg-green-100 text-green-800", activeColor: "bg-green-600 text-white" },
];

interface Props {
  stats: Stats | null;
  activeUrgency: Urgency | null;
  onSelect: (urgency: Urgency | null) => void;
}

export function StatsBar({ stats, activeUrgency, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 sm:gap-3 sm:px-6" role="group" aria-label="Filter by urgency">
      {TIERS.map(({ key, label, color, activeColor }) => {
        const count = stats?.by_urgency[key] ?? 0;
        const isZero = count === 0;
        const isActive = activeUrgency === key;
        return (
          <button
            key={key}
            onClick={() => onSelect(isActive ? null : key)}
            disabled={isZero && !isActive}
            aria-pressed={isActive}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? activeColor
                : isZero
                  ? "bg-gray-100 text-gray-400 cursor-default"
                  : `${color} hover:opacity-80`
            }`}
          >
            {label}: {count}
          </button>
        );
      })}
    </div>
  );
}
