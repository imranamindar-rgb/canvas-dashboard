import type { HealthStatus } from "../types";

function formatSyncTime(iso: string): { relative: string; absolute: string } {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60_000);
  const hrs = Math.floor(diffMs / 3_600_000);
  let relative: string;
  if (min < 1) relative = "just now";
  else if (min < 60) relative = `${min} min ago`;
  else if (hrs < 24) relative = `${hrs}h ago`;
  else relative = `${Math.floor(hrs / 24)}d ago`;
  const absolute = d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return { relative, absolute };
}

interface Props {
  health: HealthStatus | null;
  loading: boolean;
  onRefresh: () => void;
}

export function Header({ health, loading, onRefresh }: Props) {
  const sync = health?.last_sync ? formatSyncTime(health.last_sync) : null;

  return (
    <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Canvas Dashboard
        </h1>
        <p className="text-sm text-gray-500" title={sync?.absolute ?? ""}>
          Last sync: {sync ? sync.relative : "never"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {health?.status === "error" && (
          <span className="text-sm text-red-600">{health.error}</span>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Syncing..." : "Refresh"}
        </button>
      </div>
    </header>
  );
}
