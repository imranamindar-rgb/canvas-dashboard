import { useAssignments } from "./hooks/useAssignments";
import { useCalendar } from "./hooks/useCalendar";
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
    urgencyFilter,
    setUrgencyFilter,
    courseFilter,
    setCourseFilter,
    viewFilter,
    setViewFilter,
    refresh,
    showSubmitted,
    setShowSubmitted,
  } = useAssignments();

  const {
    authorized,
    loading: calLoading,
    syncing,
    lastResult,
    error: calError,
    authorize,
    syncToCalendar,
  } = useCalendar();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header health={health} loading={loading} onRefresh={refresh} />
      <SummaryBar stats={stats} />
      <div className="flex gap-1 px-6 py-2">
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
      <div className="flex items-center gap-2 px-6 py-2">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showSubmitted}
            onChange={(e) => setShowSubmitted(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show submitted assignments
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
      />
      <main className="mx-auto max-w-7xl px-4 py-4">
        <div className="rounded-lg bg-white shadow-sm">
          <AssignmentTable assignments={assignments} loading={loading} />
        </div>
      </main>
    </div>
  );
}
