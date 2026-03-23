import { useState, useEffect, useRef } from "react";
import type { HealthStatus } from "../types";
import { useCanvasStatus } from "../hooks/useCanvasStatus";

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
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onResetOnboarding?: () => void;
}

export function Header({ health, loading, onRefresh, theme, onToggleTheme, onResetOnboarding }: Props) {
  const sync = health?.last_sync ? formatSyncTime(health.last_sync) : null;
  const [showSetup, setShowSetup] = useState(false);
  const canvasStatus = useCanvasStatus();
  const setupModalRef = useRef<HTMLDivElement>(null);

  // Log health errors as a side effect, not during render
  useEffect(() => {
    if (health?.status === "error" && health.error) {
      console.error("Health check error:", health.error);
    }
  }, [health]);

  // Focus trap + Escape handler for setup modal
  useEffect(() => {
    if (!showSetup) return;
    const modal = setupModalRef.current;
    if (!modal) return;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { setShowSetup(false); return; }
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    modal.addEventListener("keydown", onKeyDown);
    return () => modal.removeEventListener("keydown", onKeyDown);
  }, [showSetup]);

  return (
    <>
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
            Canvas Dashboard <span className="text-sm font-normal text-gray-400 dark:text-zinc-500">by Imran Dar</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400" title={sync?.absolute ?? ""}>
            Last sync: {sync ? sync.relative : "never"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {health?.status === "error" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/20 px-2.5 py-0.5 text-sm text-red-600 dark:text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Connection problem
            </span>
          )}
          {health?.sync_errors && health.sync_errors.length > 0 && (
            <span
              title={`Sync warnings: ${health.sync_errors.join("; ")}`}
              className="inline-flex items-center gap-1 rounded-full bg-yellow-50 dark:bg-yellow-900/20 px-2.5 py-0.5 text-sm text-yellow-700 dark:text-yellow-400 cursor-help"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
              {health.sync_errors.length} course{health.sync_errors.length > 1 ? "s" : ""} with sync issues
            </span>
          )}
          {canvasStatus && !canvasStatus.configured && (
            <button
              onClick={() => setShowSetup(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 px-2.5 py-0.5 text-sm text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
              Canvas not set up
            </button>
          )}
          <button
            onClick={() => setShowSetup(true)}
            title="Setup & Configuration"
            className="rounded-md p-2 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-zinc-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
          <button
            onClick={onToggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-md p-2 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-zinc-200"
          >
            {theme === "dark" ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            )}
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="rounded-md bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-gray-700 dark:hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? "Syncing..." : "Refresh"}
          </button>
        </div>
      </header>

      {showSetup && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowSetup(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              ref={setupModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="setup-title"
              className="w-full max-w-lg rounded-lg bg-white dark:bg-zinc-900 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 px-6 py-4">
                <h2 id="setup-title" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Setup &amp; Configuration</h2>
                <button onClick={() => setShowSetup(false)} className="text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-5 overflow-y-auto max-h-[70vh] px-6 py-5 text-sm">

                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${canvasStatus?.configured ? "bg-green-500" : "bg-yellow-400"}`} />
                    <span className="font-medium text-gray-900 dark:text-zinc-100">Canvas API</span>
                    {canvasStatus?.api_url && (
                      <span className="text-xs text-gray-400 dark:text-zinc-500">{canvasStatus.api_url}</span>
                    )}
                  </div>
                  {canvasStatus?.configured ? (
                    <p className="text-gray-600 dark:text-zinc-400">Canvas is connected and syncing your assignments automatically.</p>
                  ) : (
                    <div className="space-y-2 text-gray-600 dark:text-zinc-400">
                      <p>Get your Canvas API token to connect:</p>
                      <ol className="list-decimal space-y-1 pl-5">
                        <li>Go to <strong>canvas.mit.edu → Account → Settings</strong></li>
                        <li>Scroll to <strong>Approved Integrations</strong> → <strong>New Access Token</strong></li>
                        <li>Copy the token</li>
                        <li>
                          <span className="font-medium">On Render:</span> Open your service → <strong>Environment</strong> → set <code className="rounded bg-gray-100 dark:bg-zinc-800 px-1">CANVAS_API_TOKEN</code>
                        </li>
                        <li>
                          <span className="font-medium">Locally:</span> Add <code className="rounded bg-gray-100 dark:bg-zinc-800 px-1">CANVAS_API_TOKEN=...</code> to <code className="rounded bg-gray-100 dark:bg-zinc-800 px-1">backend/.env</code>
                        </li>
                      </ol>
                    </div>
                  )}
                </div>

                <hr className="border-gray-200 dark:border-zinc-800" />

                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    <span className="font-medium text-gray-900 dark:text-zinc-100">Google Calendar &amp; Gmail <span className="text-xs font-normal text-gray-400 dark:text-zinc-500">(optional)</span></span>
                  </div>
                  <div className="space-y-2 text-gray-600 dark:text-zinc-400">
                    <p>Syncs assignments to Google Calendar and extracts tasks from EMBA email announcements.</p>
                    <ol className="list-decimal space-y-1.5 pl-5">
                      <li>Go to <strong>console.cloud.google.com</strong> → create or select a project</li>
                      <li>Enable <strong>Google Calendar API</strong> and <strong>Gmail API</strong></li>
                      <li>Create OAuth credentials: <strong>APIs &amp; Services → Credentials → Create Credentials → OAuth client ID → Web application</strong></li>
                      <li>
                        Add as an <strong>Authorized redirect URI</strong>:<br />
                        <code className="mt-1 block rounded bg-gray-100 dark:bg-zinc-800 px-2 py-1 text-xs break-all">
                          {window.location.origin}/api/gcal/callback
                        </code>
                      </li>
                      <li>Download the JSON file</li>
                      <li>
                        <span className="font-medium">On Render:</span> Paste the entire JSON content as the <code className="rounded bg-gray-100 dark:bg-zinc-800 px-1">GOOGLE_CLIENT_JSON</code> env var
                      </li>
                      <li>
                        <span className="font-medium">Locally:</span> Save the file as <code className="rounded bg-gray-100 dark:bg-zinc-800 px-1">backend/google_credentials.json</code>
                      </li>
                      <li>Click <strong>Authorize Google</strong> in the dashboard</li>
                    </ol>
                  </div>
                </div>

              </div>
              <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-zinc-800 px-6 py-4">
                {onResetOnboarding && (
                  <button
                    onClick={() => { onResetOnboarding(); setShowSetup(false); }}
                    className="rounded-md bg-gray-100 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                  >
                    Re-run Setup
                  </button>
                )}
                <button
                  onClick={() => setShowSetup(false)}
                  className="rounded-md bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-gray-700 dark:hover:bg-zinc-200"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
