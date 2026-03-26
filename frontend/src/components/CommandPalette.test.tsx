import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommandPalette } from "./CommandPalette";

const mockAssignments = [
  {
    id: 1,
    name: "Midterm Paper",
    course_name: "Strategy",
    course_id: 1,
    due_at: "2026-04-01T23:59:00Z",
    points_possible: 100,
    urgency: "high" as const,
    html_url: "",
    description: "",
    submission_types: [],
    locked: false,
    submitted: false,
    source: "canvas" as const,
  },
  {
    id: 2,
    name: "Final Project",
    course_name: "Finance",
    course_id: 2,
    due_at: "2026-04-15T23:59:00Z",
    points_possible: 200,
    urgency: "medium" as const,
    html_url: "",
    description: "",
    submission_types: [],
    locked: false,
    submitted: false,
    source: "canvas" as const,
  },
];

const defaultProps = {
  assignments: mockAssignments,
  onSelectAssignment: vi.fn(),
  onRefresh: vi.fn(),
  onToggleTheme: vi.fn(),
  onSwitchView: vi.fn(),
};

describe("CommandPalette", () => {
  it("does not render when closed", () => {
    render(<CommandPalette {...defaultProps} />);
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
  });

  it("opens on Cmd+K", () => {
    render(<CommandPalette {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("filters assignments by search", () => {
    render(<CommandPalette {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "Midterm" },
    });
    expect(screen.getByText("Midterm Paper")).toBeInTheDocument();
    expect(screen.queryByText("Final Project")).not.toBeInTheDocument();
  });

  it("shows action items", () => {
    render(<CommandPalette {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByText("Refresh Assignments")).toBeInTheDocument();
    expect(screen.getByText("Toggle Theme")).toBeInTheDocument();
  });

  it("closes on backdrop click", () => {
    render(<CommandPalette {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    // Click the backdrop overlay (the fixed inset div with bg-black)
    const backdrop = document.querySelector(".fixed.inset-0.bg-black\\/50");
    if (backdrop) fireEvent.click(backdrop);
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
  });
});
