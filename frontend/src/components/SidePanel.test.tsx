import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SidePanel } from "./SidePanel";

const mockAssignment = {
  id: 1,
  name: "Research Paper",
  course_name: "Strategy",
  course_id: 1,
  due_at: "2026-04-01T23:59:00Z",
  points_possible: 50,
  urgency: "high" as const,
  html_url: "https://canvas.mit.edu/courses/1/assignments/1",
  description: "<p>Write a 10-page paper</p>",
  submission_types: ["online_upload"],
  locked: false,
  submitted: false,
  source: "canvas" as const,
};

describe("SidePanel", () => {
  it("renders nothing visible when assignment is null", () => {
    const { container } = render(
      <SidePanel assignment={null} onClose={vi.fn()} />
    );
    // AnimatePresence renders but its children are empty when assignment is null
    expect(container.querySelector("h2")).toBeNull();
  });

  it("renders assignment details when open", () => {
    render(<SidePanel assignment={mockAssignment} onClose={vi.fn()} />);
    expect(screen.getByText("Research Paper")).toBeInTheDocument();
    expect(screen.getByText("Strategy")).toBeInTheDocument();
    expect(screen.getByText("50 pts")).toBeInTheDocument();
  });

  it("closes on Escape key", () => {
    const onClose = vi.fn();
    render(<SidePanel assignment={mockAssignment} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("renders Canvas link with correct href and target", () => {
    render(<SidePanel assignment={mockAssignment} onClose={vi.fn()} />);
    // The link text uses &rarr; entity, which renders as the arrow character
    const link = screen.getByRole("link", { name: /open in canvas/i });
    expect(link).toHaveAttribute(
      "href",
      "https://canvas.mit.edu/courses/1/assignments/1"
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders sanitized description HTML", () => {
    render(<SidePanel assignment={mockAssignment} onClose={vi.fn()} />);
    expect(screen.getByText("Write a 10-page paper")).toBeInTheDocument();
  });

  it("shows 'No description' when description is empty", () => {
    const noDescAssignment = { ...mockAssignment, description: "" };
    render(<SidePanel assignment={noDescAssignment} onClose={vi.fn()} />);
    expect(screen.getByText("No description")).toBeInTheDocument();
  });
});
