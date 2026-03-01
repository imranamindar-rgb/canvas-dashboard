import { useAssignments } from "./hooks/useAssignments";
import { Header } from "./components/Header";
import { StatsBar } from "./components/StatsBar";
import { CourseFilter } from "./components/CourseFilter";
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
    refresh,
  } = useAssignments();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header health={health} loading={loading} onRefresh={refresh} />
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
      <main className="mx-auto max-w-7xl px-4 py-4">
        <div className="rounded-lg bg-white shadow-sm">
          <AssignmentTable assignments={assignments} loading={loading} />
        </div>
      </main>
    </div>
  );
}
