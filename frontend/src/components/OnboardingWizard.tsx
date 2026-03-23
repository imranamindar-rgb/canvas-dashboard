import { useState } from "react";
import { api } from "../utils/api";

interface Props {
  onComplete: () => void;
  onAuthorizeGoogle: () => void;
  googleAuthorized: boolean;
}

type Step = "welcome" | "canvas" | "google";

export function OnboardingWizard({ onComplete, onAuthorizeGoogle, googleAuthorized }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [canvasStatus, setCanvasStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const testCanvas = async () => {
    setCanvasStatus("testing");
    try {
      const data = await api.get<{ configured: boolean }>("/api/canvas/status");
      setCanvasStatus(data.configured ? "success" : "error");
    } catch {
      setCanvasStatus("error");
    }
  };

  const steps: Step[] = ["welcome", "canvas", "google"];
  const currentIndex = steps.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-zinc-900 shadow-2xl border border-gray-200 dark:border-zinc-800">
        <div className="p-8">
          {step === "welcome" && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <svg className="h-7 w-7 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
                Welcome to Canvas Dashboard
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
                Track your assignments, sync to Google Calendar, and stay on top of your EMBA coursework.
              </p>
              <button
                onClick={() => setStep("canvas")}
                className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          )}

          {step === "canvas" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                Connect Canvas
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                Your Canvas API token lets the dashboard fetch your assignments.
              </p>
              <ol className="mt-4 space-y-2 text-sm text-gray-600 dark:text-zinc-400 list-decimal pl-5">
                <li>Go to <strong className="text-gray-900 dark:text-zinc-200">Canvas → Account → Settings</strong></li>
                <li>Scroll to <strong className="text-gray-900 dark:text-zinc-200">Approved Integrations</strong> → <strong className="text-gray-900 dark:text-zinc-200">New Access Token</strong></li>
                <li>Set the token as <code className="rounded bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 text-xs">CANVAS_API_TOKEN</code> env var</li>
              </ol>
              <button
                onClick={testCanvas}
                disabled={canvasStatus === "testing"}
                className="mt-4 w-full rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {canvasStatus === "testing" ? "Testing..." :
                 canvasStatus === "success" ? "Connected!" :
                 canvasStatus === "error" ? "Not Connected — Retry" :
                 "Test Connection"}
              </button>
              {canvasStatus === "success" && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Canvas is connected and syncing
                </p>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep("welcome")}
                  className="flex-1 rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("google")}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === "google" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                Google Calendar & Gmail
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                Optional. Sync assignments to your calendar and extract tasks from EMBA announcement emails.
              </p>
              {googleAuthorized ? (
                <p className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Google is connected
                </p>
              ) : (
                <button
                  onClick={onAuthorizeGoogle}
                  className="mt-4 w-full rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Connect Google
                </button>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep("canvas")}
                  className="flex-1 rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={onComplete}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  {googleAuthorized ? "Done" : "Skip"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 pb-6">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex ? "w-6 bg-indigo-600" : "w-1.5 bg-gray-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
