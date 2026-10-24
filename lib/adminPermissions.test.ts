import { describe, expect, it } from "vitest";
import {
  hasAdminPermission,
  isGrantableKey,
  sectionKey,
} from "./adminPermissions";

describe("hasAdminPermission", () => {
  it("gives the super admin everything", () => {
    expect(hasAdminPermission(["*"], "fixplan_free")).toBe(true);
    expect(hasAdminPermission(["*"], sectionKey("admin-access"))).toBe(true);
  });

  it("gives nothing without keys", () => {
    expect(hasAdminPermission([], "fixplan_free")).toBe(false);
    expect(hasAdminPermission(null, sectionKey("overview"))).toBe(false);
  });

  it("matches sections one by one or all at once", () => {
    expect(hasAdminPermission(["section:overview"], "section:overview")).toBe(
      true,
    );
    expect(hasAdminPermission(["section:overview"], "section:hld")).toBe(false);
    expect(hasAdminPermission(["section:*"], "section:hld")).toBe(true);
    expect(hasAdminPermission(["section:*"], "fixplan_free")).toBe(false);
  });

  it("never opens admin access to a granted admin", () => {
    expect(
      hasAdminPermission(
        ["section:*", "section:admin-access"],
        "section:admin-access",
      ),
    ).toBe(false);
  });

  it("lets free Pro cover the free fix plan", () => {
    expect(hasAdminPermission(["pro_free"], "fixplan_free")).toBe(true);
    expect(hasAdminPermission(["fixplan_free"], "pro_free")).toBe(false);
  });
});

describe("isGrantableKey", () => {
  it("accepts known shapes", () => {
    for (const k of [
      "section:*",
      "section:analyse-logs",
      "fixplan_free",
      "pro_free",
    ]) {
      expect(isGrantableKey(k)).toBe(true);
    }
  });

  it("rejects admin access, wildcards and junk", () => {
    for (const k of [
      "section:admin-access",
      "*",
      "section:",
      "admin",
      3,
      null,
    ]) {
      expect(isGrantableKey(k)).toBe(false);
    }
  });
});
