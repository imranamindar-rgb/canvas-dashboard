import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoginScreen } from "./LoginScreen";

describe("LoginScreen", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders login form", () => {
    render(<LoginScreen onLogin={vi.fn()} />);
    expect(screen.getByText("Canvas Dashboard")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("disables button when password is empty", () => {
    render(<LoginScreen onLogin={vi.fn()} />);
    expect(screen.getByText("Sign In")).toBeDisabled();
  });

  it("enables button when password is entered", () => {
    render(<LoginScreen onLogin={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "test" },
    });
    expect(screen.getByText("Sign In")).not.toBeDisabled();
  });

  it("shows subtitle text", () => {
    render(<LoginScreen onLogin={vi.fn()} />);
    expect(
      screen.getByText("Enter your password to continue")
    ).toBeInTheDocument();
  });
});
