import { describe, it, expect } from "vitest";
import { computeStats } from "../computeStats";
import type { Assignment } from "../../types";

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 1,
    name: "Test Assignment",
    course_name: "Test Course",
    course_id: 1,
    due_at: new Date(Date.now() + 86_400_000 * 2).toISOString(), // 2 days from now
    points_possible: 10,
    urgency: "medium",
    html_url: "https://example.com",
    description: "",
    submission_types: ["online_upload"],
    locked: false,
    submitted: false,
    source: "canvas",
    ...overrides,
  };
}

describe("computeStats", () => {
  it("returns zero counts for empty array", () => {
    const stats = computeStats([]);
    expect(stats.total).toBe(0);
    expect(stats.due_today).toBe(0);
    expect(stats.due_this_week).toBe(0);
  });

  it("counts urgency levels correctly", () => {
    const assignments = [
      makeAssignment({ id: 1, urgency: "critical" }),
      makeAssignment({ id: 2, urgency: "critical" }),
      makeAssignment({ id: 3, urgency: "high" }),
      makeAssignment({ id: 4, urgency: "overdue" }),
    ];
    const stats = computeStats(assignments);
    expect(stats.by_urgency.critical).toBe(2);
    expect(stats.by_urgency.high).toBe(1);
    expect(stats.by_urgency.overdue).toBe(1);
    expect(stats.by_urgency.medium).toBe(0);
    expect(stats.by_urgency.runway).toBe(0);
    expect(stats.total).toBe(4);
  });

  it("counts courses correctly", () => {
    const assignments = [
      makeAssignment({ id: 1, course_name: "Math" }),
      makeAssignment({ id: 2, course_name: "Math" }),
      makeAssignment({ id: 3, course_name: "Science" }),
    ];
    const stats = computeStats(assignments);
    expect(stats.by_course["Math"]).toBe(2);
    expect(stats.by_course["Science"]).toBe(1);
  });

  it("excludes submitted assignments from all counts", () => {
    const assignments = [
      makeAssignment({ id: 1, submitted: false }),
      makeAssignment({ id: 2, submitted: true }),
    ];
    const stats = computeStats(assignments);
    expect(stats.total).toBe(1);
  });

  it("counts due_today correctly", () => {
    const today = new Date();
    today.setHours(20, 0, 0, 0); // today at 8pm
    const tomorrow = new Date(Date.now() + 86_400_000 * 2);
    const assignments = [
      makeAssignment({ id: 1, due_at: today.toISOString() }),
      makeAssignment({ id: 2, due_at: tomorrow.toISOString() }),
    ];
    const stats = computeStats(assignments);
    expect(stats.due_today).toBe(1);
  });

  it("includes email tasks in counts", () => {
    const assignments = [
      makeAssignment({ id: 1, source: "canvas" }),
      makeAssignment({ id: "email-123-0", source: "email", course_name: "EMBA Announcements" }),
    ];
    const stats = computeStats(assignments);
    expect(stats.total).toBe(2);
    expect(stats.by_course["EMBA Announcements"]).toBe(1);
  });
});
