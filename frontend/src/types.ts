export type Urgency = "overdue" | "critical" | "high" | "medium" | "runway";

export interface Assignment {
  id: number | string;
  name: string;
  course_name: string;
  course_id: number;
  due_at: string | null;
  points_possible: number | null;
  urgency: Urgency;
  html_url: string;
  description: string;
  submission_types: string[];
  locked: boolean;
  submitted: boolean;
  source: "canvas" | "email";
  email_subject?: string;
  email_date?: string;
  next_action?: string | null;
  effort?: "S" | "M" | "L" | "XL" | null;
  planned_day?: string | null;
}

export interface Stats {
  total: number;
  by_urgency: Record<Urgency, number>;
  by_course: Record<string, number>;
  due_today: number;
  due_this_week: number;
}

export interface HealthStatus {
  status: "ok" | "error";
  last_sync: string | null;
  assignment_count: number;
  error: string | null;
  sync_errors: string[];
}
