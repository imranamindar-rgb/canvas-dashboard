import { useState, useMemo } from "react";
import { useAssignments } from "./hooks/useAssignments";
import { useCalendar } from "./hooks/useCalendar";
import { useEmail } from "./hooks/useEmail";
import { computeStats } from "./utils/computeStats";
import { EmailBar } from "./components/EmailBar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Header } from "./components/Header";
import { SummaryBar } from "./components/SummaryBar";
import { StatsBar } from "./components/StatsBar";
import { CourseFilter } from "./components/CourseFilter";
import { CalendarBar } from "./components/CalendarBar";
import { AssignmentTable } from "./components/AssignmentTable";
import { SearchBar } from "./components/SearchBar";

export default function App() {
  const {
    assignments,
    health,
    loading,
    error: fetchError,
    searchQuery,
    setSearchQuery,
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
    lastCheckedId,
    undoLastCheck,
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

  const handleGroupByCourse = (checked: boolean) => {
    setGroupByCourse(checked);
    if (checked) setGroupBySource(false);
  };
  const handleGroupBySource = (checked: boolean) => {
    setGroupBySource(checked);
    if (checked) setGroupByCourse(false);
  };

  const allTasks = useMemo(() => [...assignments, ...emailTasks], [assignments, emailTasks]);
  const stats = useMemo(() => computeStats(allTasks), [allTasks]);
  const hasActiveFilters = !!(urgencyFilter || courseFilter || viewFilter);

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-gray-50">
      <Header health={health} loading={loading} onRefresh={refresh} />
      <SearchBar query={searchQuery} onChange={setSearchQuery} />
      <SummaryBar stats={stats} />
      <div className="flex gap-1 px-4 py-2 sm:px-6" role="group" aria-label="Filter by time range">
        {([
          { key: null, label: "All" },
          { key: "today" as const, label: "Due Today" },
          { key: "week" as const, label: "This Week" },
        ] as const).map(({ key, label }) => (
          <button
            key={label}
            onClick={() => setViewFilter(key)}
            aria-pressed={viewFilter === key}
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
          Show completed
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={groupByCourse}
            onChange={(e) => handleGroupByCourse(e.target.checked)}
            className="rounded border-gray-300"
          />
          Group by course
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={groupBySource}
            onChange={(e) => handleGroupBySource(e.target.checked)}
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
        taskCount={emailTasks.length}
        onAuthorize={authorize}
      />
      {fetchError && (
        <div className="mx-auto max-w-7xl px-4 py-2">
          <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span className="text-sm text-red-700">
                Unable to load assignments. Please check your connection and try again.
              </span>
            </div>
            <button
              onClick={refresh}
              className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
            >
              Retry
            </button>
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
            hasActiveFilters={hasActiveFilters}
            searchQuery={searchQuery}
          />
        </div>
      </main>
      {lastCheckedId !== null && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
            <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Assignment marked done</span>
            <button
              onClick={undoLastCheck}
              className="ml-2 rounded px-2 py-0.5 font-medium text-blue-300 hover:text-blue-200 hover:bg-gray-800 transition-colors"
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
