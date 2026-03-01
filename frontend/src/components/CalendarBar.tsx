import { useState } from "react";
import type { Assignment } from "../types";

interface Props {
  authorized: boolean;
  loading: boolean;
  syncing: boolean;
  lastResult: string | null;
  error: string | null;
  onAuthorize: () => void;
  onSync: () => void;
  assignments: Assignment[];
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
}: Props) {
  const [showPreview, setShowPreview] = useState(false);

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
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Authorizing..." : "Authorize Google"}
          </button>
        )}

        {authorized && (
          <button
            onClick={() => setShowPreview(true)}
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

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Sync Preview</h2>
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
                    {new Date(a.due_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 justify-end">
              <button
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
      )}
    </>
  );
}
