interface Props {
  authorized: boolean;
  loading: boolean;
  syncing: boolean;
  lastResult: string | null;
  error: string | null;
  onAuthorize: () => void;
  onSync: () => void;
}

export function CalendarBar({
  authorized,
  loading,
  syncing,
  lastResult,
  error,
  onAuthorize,
  onSync,
}: Props) {
  return (
    <div className="flex items-center gap-4 border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            authorized ? "bg-green-500" : "bg-gray-300"
          }`}
        />
        <span className="text-sm text-gray-600">
          Google Calendar: {authorized ? "Connected" : "Not connected"}
        </span>
      </div>

      {!authorized && (
        <button
          onClick={onAuthorize}
          disabled={loading}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Authorizing..." : "Authorize Google"}
        </button>
      )}

      {authorized && (
        <button
          onClick={onSync}
          disabled={syncing}
          className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync to Calendar"}
        </button>
      )}

      {lastResult && (
        <span className="text-sm text-green-600">{lastResult}</span>
      )}

      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
