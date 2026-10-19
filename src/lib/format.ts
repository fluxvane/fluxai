const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Compact "time ago" label for list metadata: "just now", "5m", "3h",
 * "Yesterday", a weekday within the last week, then a short date.
 */
export function formatRelativeTime(
  value: string | Date,
  now: Date = new Date(),
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = now.getTime() - date.getTime();
  if (Number.isNaN(diff)) return "";
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (date >= startOfToday) return `${Math.floor(diff / HOUR)}h ago`;
  if (date >= new Date(startOfToday.getTime() - DAY)) return "Yesterday";
  if (date >= new Date(startOfToday.getTime() - 6 * DAY)) {
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  });
}

/** 1234 → "1,234"; 1_250_000 → "1.3M". Compact only past six digits. */
export function formatCount(n: number): string {
  if (Math.abs(n) < 1_000_000) return n.toLocaleString();
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}
