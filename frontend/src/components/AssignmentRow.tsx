import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";
import type { Assignment } from "../types";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import { URGENCY_STYLES, URGENCY_BORDER, ROW_BG, ROW_HOVER } from "../utils/urgencyStyles";
import { getCourseColor } from "../utils/courseColors";
import { api } from "../utils/api";

interface Props {
  assignment: Assignment;
  checked: boolean;
  onToggleChecked: (id: number | string) => void;
  focusedId?: string | number | null;
  expandedIds?: Set<string | number>;
  onToggleExpand?: (id: string | number) => void;
  showEffort?: boolean;
  onMetaChange?: () => void;
  anthropicAvailable?: boolean;
}

export function AssignmentRow({ assignment, checked, onToggleChecked, focusedId, expandedIds, onToggleExpand, showEffort, onMetaChange, anthropicAvailable }: Props) {
  const [localExpanded, setLocalExpanded] = useState(false);
  // Use controlled expandedIds if provided, otherwise fall back to local state
  const expanded = expandedIds !== undefined ? expandedIds.has(assignment.id) : localExpanded;
  const isFocused = focusedId !== undefined && focusedId !== null && focusedId === assignment.id;

  // Inline editor state (only relevant when expanded)
  const [editingNextAction, setEditingNextAction] = useState<string>(assignment.next_action ?? "");
  const [nextActionSaving, setNextActionSaving] = useState(false);
  const [nextActionSuggestLoading, setNextActionSuggestLoading] = useState(false);
  const [nextActionError, setNextActionError] = useState<string | null>(null);
  const [effortSaving, setEffortSaving] = useState(false);
  const [effortError, setEffortError] = useState<string | null>(null);

  // Reset editingNextAction when assignment.next_action changes from parent
  useEffect(() => {
    setEditingNextAction(assignment.next_action ?? "");
  }, [assignment.next_action]);

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand(assignment.id);
    } else {
      setLocalExpanded((prev) => !prev);
    }
  };

  const due = assignment.due_at ? new Date(assignment.due_at) : null;
  const dateStr = due
    ? due.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    : "No due date";
  const timeStr = due
    ? due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : "";

  const courseColor = getCourseColor(assignment.course_name);

  const handleSaveNextAction = async () => {
    setNextActionSaving(true);
    setNextActionError(null);
    try {
      await api.put(`/api/assignments/${assignment.id}/next-action`, { next_action: editingNextAction });
      onMetaChange?.();
    } catch {
      setNextActionError("Failed to save. Please try again.");
    } finally {
      setNextActionSaving(false);
    }
  };

  const handleSuggestNextAction = async () => {
    setNextActionSuggestLoading(true);
    setNextActionError(null);
    try {
      const data = await api.post<{ suggestion: string; error?: string }>(
        `/api/assignments/${assignment.id}/next-action/suggest`,
        { name: assignment.name, description: assignment.description ?? "", course_name: assignment.course_name }
      );
      if (data.error) {
        setNextActionError(data.error);
      } else {
        setEditingNextAction(data.suggestion);
        onMetaChange?.();
      }
    } catch {
      setNextActionError("Suggestion failed. Please try again.");
    } finally {
      setNextActionSuggestLoading(false);
    }
  };

  const handleSetEffort = async (effort: "S" | "M" | "L" | "XL") => {
    setEffortSaving(true);
    setEffortError(null);
    try {
      await api.put(`/api/assignments/${assignment.id}/effort`, { effort });
      onMetaChange?.();
    } catch {
      setEffortError("Failed to save effort. Please try again.");
    } finally {
      setEffortSaving(false);
    }
  };

  return (
    <>
      <tr
        tabIndex={0}
        onClick={handleToggleExpand}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggleExpand();
          }
        }}
        className={`cursor-pointer border-b border-gray-100 dark:border-zinc-800 border-l-[3px] ${URGENCY_BORDER[assignment.urgency]} transition-all duration-200 ${
          checked ? "opacity-50" : ""
        } ${ROW_BG[assignment.urgency] || ""} ${
          ROW_HOVER[assignment.urgency] || "hover:bg-gray-50"
        } hover:shadow-sm${isFocused ? " ring-2 ring-inset ring-indigo-500" : ""}`}
      >
        <td className="px-3 py-3">
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleChecked(assignment.id); }}
              className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all duration-200 ${
                checked
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-gray-300 dark:border-zinc-600 hover:border-gray-400 dark:hover:border-zinc-500"
              }`}
              aria-label={checked ? "Mark as not done" : "Mark as done"}
            >
              {checked && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleExpand(); }}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse assignment" : "Expand assignment"}
              className="flex h-4 w-4 items-center justify-center text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"
            >
              <svg
                className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </td>
        <td className="px-6 py-3 text-sm text-gray-600 dark:text-zinc-400">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${courseColor.bg} ${courseColor.text} ${courseColor.border}`}>
            {assignment.course_name}
          </span>
        </td>
        <td className="px-6 py-3">
          <div className="flex flex-col gap-0.5">
            <span className={`text-sm font-medium ${checked ? "line-through text-gray-400 dark:text-zinc-500" : "text-gray-900 dark:text-zinc-100"}`}>
              {assignment.name}
            </span>
            {assignment.next_action && (
              <span
                className="text-xs text-gray-500 dark:text-zinc-400 truncate max-w-xs"
                title={assignment.next_action ?? undefined}
              >
                &rarr; {assignment.next_action}
              </span>
            )}
          </div>
        </td>
        <td className="px-6 py-3 text-sm text-gray-600 dark:text-zinc-400">
          <span className="font-medium">{due ? formatRelativeTime(due) : "No due date"}</span>
          {due && <span className="ml-1 text-gray-400 dark:text-zinc-500">({dateStr} {timeStr})</span>}
        </td>
        <td className="px-6 py-3 text-sm text-gray-600 dark:text-zinc-400 text-right">
          {assignment.points_possible ?? "\u2014"}
        </td>
        {showEffort ? (
          <td className="px-3 py-3 text-center">
            {assignment.effort ? (
              <span className="inline-flex items-center rounded bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-gray-700 dark:text-zinc-300">
                {assignment.effort}
              </span>
            ) : (
              <span className="text-xs text-gray-300 dark:text-zinc-600">&mdash;</span>
            )}
          </td>
        ) : (
          <td className="px-6 py-3">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                URGENCY_STYLES[assignment.urgency]
              }`}
            >
              {assignment.urgency}
            </span>
          </td>
        )}
      </tr>
      <AnimatePresence>
        {expanded && (
          <tr className="border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
            <td colSpan={6} className="px-0 py-0">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-4">
                  {/* Description */}
                  <div className="mb-3 text-sm text-gray-700 dark:text-zinc-300">
                    {assignment.description ? (
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(assignment.description) }} />
                    ) : (
                      <p className="italic text-gray-400 dark:text-zinc-500">No description</p>
                    )}
                  </div>

                  <hr className="border-gray-200 dark:border-zinc-700 mb-3" />

                  {/* Next Action editor */}
                  <div className="mt-3">
                    <label className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Next Action</label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        value={editingNextAction}
                        onChange={(e) => setEditingNextAction(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        maxLength={500}
                        placeholder="What's the first physical action?"
                        className="flex-1 rounded-md border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-1.5 text-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                      />
                      {anthropicAvailable !== false && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSuggestNextAction(); }}
                          disabled={nextActionSuggestLoading}
                          className="rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 disabled:opacity-50"
                          title="Ask Claude to suggest a next action"
                          aria-label="Suggest next action with Claude"
                        >
                          {nextActionSuggestLoading ? "Suggesting..." : "\u2726 Suggest"}
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSaveNextAction(); }}
                        disabled={nextActionSaving || editingNextAction === (assignment.next_action ?? "")}
                        className="rounded-md bg-gray-900 dark:bg-zinc-100 px-3 py-1.5 text-xs font-medium text-white dark:text-zinc-900 hover:bg-gray-700 dark:hover:bg-zinc-200 disabled:opacity-50"
                      >
                        {nextActionSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                    {nextActionError && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{nextActionError}</p>}
                  </div>

                  <hr className="border-gray-200 dark:border-zinc-700 mt-3 mb-3" />

                  {/* Effort selector */}
                  <div className="mt-3">
                    <label className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Effort</label>
                    <div className="mt-1 flex gap-1.5">
                      {(["S", "M", "L", "XL"] as const).map((e) => (
                        <button
                          key={e}
                          onClick={(ev) => { ev.stopPropagation(); handleSetEffort(e); }}
                          disabled={effortSaving}
                          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                            assignment.effort === e
                              ? "bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                              : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                          }`}
                          aria-pressed={assignment.effort === e}
                          aria-label={`Set effort to ${e}`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                    {effortError && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{effortError}</p>}
                  </div>

                  <hr className="border-gray-200 dark:border-zinc-700 mt-3 mb-3" />

                  <a
                    href={assignment.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Open in Canvas &rarr;
                  </a>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}
