import { describe, expect, it } from "vitest";
import { istDate } from "@/lib/istDate";

describe("istDate", () => {
  it("uses India's calendar day", () => {
    // 20:00 UTC is 01:30 the next day in India.
    expect(istDate(new Date("2026-10-09T20:00:00Z"))).toBe("2026-10-10");
    expect(istDate(new Date("2026-10-09T18:00:00Z"))).toBe("2026-10-09");
  });
});
