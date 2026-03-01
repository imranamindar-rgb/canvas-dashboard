import type { Stats } from "../types";

interface Props {
  stats: Stats | null;
  activeCourse: string | null;
  onSelect: (course: string | null) => void;
}

export function CourseFilter({ stats, activeCourse, onSelect }: Props) {
  const courses = stats ? Object.keys(stats.by_course).sort() : [];

  if (courses.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-6 py-2">
      <button
        onClick={() => onSelect(null)}
        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
          activeCourse === null
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        All Courses
      </button>
      {courses.map((name) => (
        <button
          key={name}
          onClick={() => onSelect(activeCourse === name ? null : name)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            activeCourse === name
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
