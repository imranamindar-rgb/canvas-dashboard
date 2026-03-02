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
    <header className="flex flex-col gap-3 border-b border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Canvas Dashboard
        </h1>
        <p className="text-sm text-gray-500" title={sync?.absolute ?? ""}>
          Last sync: {sync ? sync.relative : "never"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {health?.status === "error" && (() => {
          if (health.error) console.error("Health check error:", health.error);
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-sm text-red-600">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Connection problem
            </span>
          );
        })()}
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
