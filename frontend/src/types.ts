export type Urgency = "critical" | "high" | "medium" | "runway";

export interface Assignment {
  id: number;
  name: string;
  course_name: string;
  course_id: number;
  due_at: string;
  points_possible: number | null;
  urgency: Urgency;
  html_url: string;
  description: string;
  submission_types: string[];
  locked: boolean;
}

export interface Stats {
  total: number;
  by_urgency: Record<Urgency, number>;
  by_course: Record<string, number>;
}

export interface HealthStatus {
  status: "ok" | "error";
  last_sync: string | null;
  assignment_count: number;
  error: string | null;
}
