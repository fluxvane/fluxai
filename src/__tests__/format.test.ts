import { describe, it, expect } from "vitest";
import { formatRelativeTime, formatCount } from "../lib/format";

describe("formatRelativeTime", () => {
  const now = new Date(2026, 9, 1, 15, 0, 0); // Thu Oct 1 2026, 15:00 local

  it("labels very recent times as just now", () => {
    expect(formatRelativeTime(new Date(2026, 9, 1, 14, 59, 30), now)).toBe(
      "just now",
    );
  });

  it("uses minutes within the hour", () => {
    expect(formatRelativeTime(new Date(2026, 9, 1, 14, 35), now)).toBe(
      "25m ago",
    );
  });

  it("uses hours earlier today", () => {
    expect(formatRelativeTime(new Date(2026, 9, 1, 9, 0), now)).toBe("6h ago");
  });

  it("says Yesterday for the previous calendar day", () => {
    expect(formatRelativeTime(new Date(2026, 8, 30, 23, 0), now)).toBe(
      "Yesterday",
    );
  });

  it("accepts ISO strings and returns empty for invalid input", () => {
    expect(formatRelativeTime(now.toISOString(), now)).toBe("just now");
    expect(formatRelativeTime("not a date", now)).toBe("");
  });
});

describe("formatCount", () => {
  it("keeps exact values below a million", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999_999)).toBe((999_999).toLocaleString());
  });

  it("compacts large values", () => {
    expect(formatCount(1_250_000)).toMatch(/1\.3\s?M/);
  });
});
