import { afterEach, describe, expect, it, vi } from "vitest";
import {
  localISODate,
  localYesterdayISODate,
  msUntilNextLocalMidnight,
} from "./localDate";

describe("localISODate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses local calendar date, not UTC", () => {
    // 19 Jul 2026 00:30 in IST (UTC+5:30) == 18 Jul 2026 19:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T19:00:00.000Z"));

    // In IST this is 19 Jul; in US timezones it may still be 18 Jul.
    // Assert consistency with local getters rather than a fixed string.
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(localISODate()).toBe(expected);
    // Must NOT blindly follow UTC ISO date when local day differs.
    const utcDay = new Date().toISOString().slice(0, 10);
    if (expected !== utcDay) {
      expect(localISODate()).not.toBe(utcDay);
    }
  });

  it("formats an explicit local date", () => {
    const d = new Date(2026, 6, 19, 0, 1, 0); // 19 Jul 2026 00:01 local
    expect(localISODate(d)).toBe("2026-07-19");
    expect(localYesterdayISODate(d)).toBe("2026-07-18");
  });

  it("computes positive ms until next midnight", () => {
    const d = new Date(2026, 6, 19, 23, 59, 0);
    expect(msUntilNextLocalMidnight(d)).toBeGreaterThan(0);
    expect(msUntilNextLocalMidnight(d)).toBeLessThan(120_000);
  });
});
