import { describe, expect, it } from "vitest";
import { ADMIN_DOC_SECTIONS, adminDocNav, getAdminDocSection } from "./index";
import { allPlanChecklistIds } from "./planChecklist";

describe("admin docs", () => {
  it("has unique, URL-safe section ids", () => {
    const ids = ADMIN_DOC_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("covers the requested structure", () => {
    for (const id of [
      "overview",
      "tech-stack",
      "radio",
      "hld",
      "lld",
      "before-login",
      "after-login",
      "admin-access",
      "vision",
      "user-need",
      "phases",
      "competition",
      "growth",
      "revenue",
      "plan-review",
    ]) {
      expect(getAdminDocSection(id), id).toBeDefined();
    }
  });

  it("documents every API route in the app", async () => {
    const { readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const routes: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (name === "route.ts") routes.push(p);
      }
    };
    walk(join(process.cwd(), "app/api"));

    const documented = JSON.stringify(ADMIN_DOC_SECTIONS);
    const missing = routes
      .map((p) => p.slice(p.indexOf("app/api") + 3, -"/route.ts".length))
      .filter((path) => !path.startsWith("/api/app-links"))
      .filter((path) => !documented.includes(path));
    expect(missing).toEqual([]);
  });

  it("groups the sidebar in section order", () => {
    const nav = adminDocNav();
    expect(nav[0].group).toBe("Start here");
    expect(nav.flatMap((g) => g.items).length).toBe(ADMIN_DOC_SECTIONS.length);
  });

  it("gives every plan checklist item a unique id the database accepts", () => {
    const ids = allPlanChecklistIds();
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    // Same pattern as the CHECK in migration 060.
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,64}$/);
  });
});
