import { useState } from "react";
import { useAssignments } from "./hooks/useAssignments";
import { useCalendar } from "./hooks/useCalendar";
import { useEmail } from "./hooks/useEmail";
import { EmailBar } from "./components/EmailBar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Header } from "./components/Header";
import { SummaryBar } from "./components/SummaryBar";
import { StatsBar } from "./components/StatsBar";
import { CourseFilter } from "./components/CourseFilter";
import { CalendarBar } from "./components/CalendarBar";
import { AssignmentTable } from "./components/AssignmentTable";

export default function App() {
  const {
    assignments,
    stats,
    health,
    loading,
    error: fetchError,
    urgencyFilter,
    setUrgencyFilter,
    courseFilter,
    setCourseFilter,
    viewFilter,
    setViewFilter,
    refresh,
    showSubmitted,
    setShowSubmitted,
    checkedIds,
    toggleChecked,
  } = useAssignments();

  const [groupByCourse, setGroupByCourse] = useState(false);

  const {
    authorized,
    loading: calLoading,
    syncing,
    lastResult,
    error: calError,
    authorize,
    syncToCalendar,
  } = useCalendar();

  const {
    authorized: emailAuthorized,
    loading: emailLoading,
    syncing: emailSyncing,
    lastResult: emailLastResult,
    error: emailError,
    tasks: emailTasks,
    syncEmail,
  } = useEmail();

  const [groupBySource, setGroupBySource] = useState(false);

  const allTasks = [...assignments, ...emailTasks];

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-gray-50">
      <Header health={health} loading={loading} onRefresh={refresh} />
      <SummaryBar stats={stats} />
      <div className="flex gap-1 px-4 py-2 sm:px-6">
        {([
          { key: null, label: "All" },
          { key: "today" as const, label: "Due Today" },
          { key: "week" as const, label: "This Week" },
        ] as const).map(({ key, label }) => (
          <button
            key={label}
            onClick={() => setViewFilter(key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              viewFilter === key
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <StatsBar
        stats={stats}
        activeUrgency={urgencyFilter}
        onSelect={setUrgencyFilter}
      />
      <CourseFilter
        stats={stats}
        activeCourse={courseFilter}
        onSelect={setCourseFilter}
      />
      <div className="flex flex-wrap items-center gap-4 px-4 py-2 sm:px-6">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showSubmitted}
            onChange={(e) => setShowSubmitted(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show submitted
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={groupByCourse}
            onChange={(e) => setGroupByCourse(e.target.checked)}
            className="rounded border-gray-300"
          />
          Group by course
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={groupBySource}
            onChange={(e) => setGroupBySource(e.target.checked)}
            className="rounded border-gray-300"
          />
          Group by source
        </label>
      </div>
      <CalendarBar
        authorized={authorized}
        loading={calLoading}
        syncing={syncing}
        lastResult={lastResult}
        error={calError}
        onAuthorize={authorize}
        onSync={syncToCalendar}
        assignments={assignments}
      />
      <EmailBar
        authorized={emailAuthorized}
        loading={emailLoading}
        syncing={emailSyncing}
        lastResult={emailLastResult}
        error={emailError}
        onSync={syncEmail}
      />
      {fetchError && (
        <div className="mx-auto max-w-7xl px-4 py-2">
          <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {fetchError}
          </div>
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 py-4">
        <div className="rounded-lg bg-white shadow-sm">
          <AssignmentTable
            assignments={allTasks}
            loading={loading}
            checkedIds={checkedIds}
            onToggleChecked={toggleChecked}
            groupByCourse={groupByCourse}
            groupBySource={groupBySource}
          />
        </div>
      </main>
    </div>
    </ErrorBoundary>
  );
}
