import { describe, it, expect, vi, afterEach } from "vitest";
import { formatRelativeTime } from "../formatRelativeTime";

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "in Xd" for future dates', () => {
    const future = new Date(Date.now() + 3 * 86_400_000);
    expect(formatRelativeTime(future)).toBe("in 3d");
  });

  it('returns "Xd ago" for past dates', () => {
    const past = new Date(Date.now() - 5 * 86_400_000);
    expect(formatRelativeTime(past)).toBe("5d ago");
  });

  it('returns "tomorrow" for 1 day in the future', () => {
    const tomorrow = new Date(Date.now() + 86_400_000);
    expect(formatRelativeTime(tomorrow)).toBe("tomorrow");
  });

  it('returns "yesterday" for 1 day in the past', () => {
    const yesterday = new Date(Date.now() - 86_400_000);
    expect(formatRelativeTime(yesterday)).toBe("yesterday");
  });

  it('returns "in Xh" for hours in the future', () => {
    const future = new Date(Date.now() + 3 * 3_600_000);
    expect(formatRelativeTime(future)).toBe("in 3h");
  });

  it('returns "Xh ago" for hours in the past', () => {
    const past = new Date(Date.now() - 2 * 3_600_000);
    expect(formatRelativeTime(past)).toBe("2h ago");
  });

  it('returns "in Xm" for minutes in the future', () => {
    const future = new Date(Date.now() + 15 * 60_000);
    expect(formatRelativeTime(future)).toBe("in 15m");
  });
});
