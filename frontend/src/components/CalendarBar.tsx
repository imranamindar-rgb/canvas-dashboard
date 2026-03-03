import { useState, useEffect, useRef } from "react";
import type { Assignment } from "../types";

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

interface Props {
  authorized: boolean;
  loading: boolean;
  syncing: boolean;
  lastResult: string | null;
  error: string | null;
  onAuthorize: () => void;
  onSync: () => void;
  assignments: Assignment[];
  lastCalSync?: string | null;
}

export function CalendarBar({
  authorized,
  loading,
  syncing,
  lastResult,
  error,
  onAuthorize,
  onSync,
  assignments,
  lastCalSync,
}: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showPreview) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPreview(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showPreview]);

  useEffect(() => {
    if (showPreview) {
      cancelRef.current?.focus();
    }
  }, [showPreview]);

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
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
            aria-label="Authorize Google Calendar"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Authorizing..." : "Authorize Google"}
          </button>
        )}

        {authorized && (
          <button
            onClick={() => setShowPreview(true)}
            disabled={syncing}
            aria-label="Sync assignments to Google Calendar"
            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "Sync to Calendar"}
          </button>
        )}

        {authorized && lastCalSync && (
          <span className="text-xs text-gray-400">
            Last synced {formatRelativeTime(lastCalSync)}
          </span>
        )}

        {lastResult && (
          <span className="text-sm text-green-600">{lastResult}</span>
        )}

        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {showPreview && (
        <>
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowPreview(false)} />
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="sync-preview-title">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h2 id="sync-preview-title" className="mb-4 text-lg font-semibold">Sync Preview</h2>
            <p className="mb-3 text-sm text-gray-600">
              {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} will be synced to Google Calendar:
            </p>
            <ul className="mb-4 max-h-60 space-y-2 overflow-y-auto">
              {assignments.map((a) => (
                <li key={a.id} className="flex justify-between text-sm">
                  <span className="font-medium truncate mr-2">
                    [{a.course_name}] {a.name}
                  </span>
                  <span className="text-gray-500 whitespace-nowrap">
                    {a.due_at ? new Date(a.due_at).toLocaleDateString() : "No due date"}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 justify-end">
              <button
                ref={cancelRef}
                onClick={() => setShowPreview(false)}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  onSync();
                }}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
              >
                Confirm Sync
              </button>
            </div>
          </div>
        </div>
        </>
      )}
    </>
  );
}
