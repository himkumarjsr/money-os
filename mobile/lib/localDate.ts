/**
 * Calendar helpers using the device's local timezone.
 * Avoid `toISOString().slice(0, 10)` — that is UTC and lags after local midnight
 * (e.g. 12:01 AM IST is still the previous UTC day).
 */

export function localISODate(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function localYesterdayISODate(d: Date = new Date()): string {
  const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  return localISODate(prev);
}

/** Milliseconds until the next local midnight (+ small buffer). */
export function msUntilNextLocalMidnight(d: Date = new Date()): number {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return Math.max(1000, next.getTime() - d.getTime() + 50);
}

/** "2 Oct" for an expense's YYYY-MM-DD date, read as a local calendar day. */
export function formatExpenseDate(date: string | null | undefined): string {
  const ymd = String(date ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}
