import { describe, expect, it } from "vitest";
import { normalizeAdminEmail } from "./adminEmail";

describe("normalizeAdminEmail", () => {
  it("trims and lower-cases", () => {
    expect(normalizeAdminEmail("  HimKumarJsr@Gmail.com ")).toBe(
      "himkumarjsr@gmail.com",
    );
  });

  it("rejects non-emails", () => {
    expect(normalizeAdminEmail("")).toBeNull();
    expect(normalizeAdminEmail("no-at-sign")).toBeNull();
    expect(normalizeAdminEmail("a@b")).toBeNull();
    expect(normalizeAdminEmail("a b@c.com")).toBeNull();
    expect(normalizeAdminEmail(42)).toBeNull();
    expect(normalizeAdminEmail(`${"a".repeat(250)}@x.com`)).toBeNull();
  });
});
