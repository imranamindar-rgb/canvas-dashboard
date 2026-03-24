import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";
import type { Assignment } from "../types";
import { URGENCY_STYLES } from "../utils/urgencyStyles";
import { getCourseColor } from "../utils/courseColors";
import { formatRelativeTime } from "../utils/formatRelativeTime";

interface Props {
  assignment: Assignment | null;
  onClose: () => void;
  onMetaChange?: () => void;
  anthropicAvailable?: boolean;
}

export function SidePanel({ assignment, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (assignment) {
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }
  }, [assignment, onClose]);

  return (
    <AnimatePresence>
      {assignment && (
        <>
          <div className="fixed inset-0 z-30 hidden md:block" onClick={onClose} />
          <motion.div
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 z-40 hidden md:flex h-full w-[400px] flex-col border-l border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getCourseColor(assignment.course_name).bg} ${getCourseColor(assignment.course_name).text}`}>
                  {assignment.course_name}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${URGENCY_STYLES[assignment.urgency]}`}>
                  {assignment.urgency}
                </span>
              </div>
              <button onClick={onClose} className="rounded-md p-1 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                {assignment.name}
              </h2>

              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-zinc-400">
                {assignment.due_at && (
                  <span>{formatRelativeTime(new Date(assignment.due_at))}</span>
                )}
                {assignment.points_possible != null && (
                  <span>{assignment.points_possible} pts</span>
                )}
              </div>

              {assignment.description ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-zinc-300"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(assignment.description) }}
                />
              ) : (
                <p className="text-sm italic text-gray-400 dark:text-zinc-500">No description</p>
              )}

              {assignment.html_url && (
                <a
                  href={assignment.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  Open in Canvas &rarr;
                </a>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
