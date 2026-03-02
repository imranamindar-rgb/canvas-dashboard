interface Props {
  authorized: boolean;
  loading: boolean;
  syncing: boolean;
  lastResult: string | null;
  error: string | null;
  onSync: () => void;
  taskCount?: number;
  onAuthorize?: () => void;
}

export function EmailBar({
  authorized,
  loading,
  syncing,
  lastResult,
  error,
  onSync,
  taskCount,
  onAuthorize,
}: Props) {
  const statusText = authorized
    ? taskCount && taskCount > 0
      ? `${taskCount} task${taskCount !== 1 ? "s" : ""} synced`
      : "Connected \u2014 click Sync to scan emails"
    : "Not connected";

  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            authorized ? "bg-purple-500" : "bg-gray-300"
          }`}
        />
        <span className="text-sm text-gray-600">
          Email Tasks: {statusText}
        </span>
      </div>

      {!authorized && onAuthorize && (
        <button
          onClick={onAuthorize}
          disabled={loading}
          aria-label="Authorize Google for Email Tasks"
          className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
        >
          Authorize Google
        </button>
      )}

      {authorized && (
        <button
          onClick={onSync}
          disabled={syncing || loading}
          className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
        >
          {syncing ? "Extracting..." : "Sync Email Tasks"}
        </button>
      )}

      {lastResult && (
        <span className="text-sm text-green-600">{lastResult}</span>
      )}

      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
