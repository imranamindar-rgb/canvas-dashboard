import type { HealthStatus } from "../types";

interface Props {
  health: HealthStatus | null;
  loading: boolean;
  onRefresh: () => void;
}

export function Header({ health, loading, onRefresh }: Props) {
  const lastSync = health?.last_sync
    ? new Date(health.last_sync).toLocaleTimeString()
    : "never";

  return (
    <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Canvas Dashboard
        </h1>
        <p className="text-sm text-gray-500">Last sync: {lastSync}</p>
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
