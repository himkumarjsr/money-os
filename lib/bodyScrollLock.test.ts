import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("bodyScrollLock", () => {
  beforeEach(async () => {
    vi.resetModules();
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  });

  afterEach(() => {
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  });

  it("lockBodyScroll hides overflow on body and html", async () => {
    const { lockBodyScroll } = await import("./bodyScrollLock");
    const unlock = lockBodyScroll();

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");

    unlock();
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("nested locks stay locked until the last unlock", async () => {
    const { lockBodyScroll } = await import("./bodyScrollLock");
    const unlock1 = lockBodyScroll();
    const unlock2 = lockBodyScroll();

    expect(document.body.style.overflow).toBe("hidden");

    unlock1();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");

    unlock2();
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("calling the same unlock twice is a no-op", async () => {
    const { lockBodyScroll } = await import("./bodyScrollLock");
    const unlock = lockBodyScroll();
    unlock();
    unlock();

    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("clearBodyScrollLocks resets count and overflow immediately", async () => {
    const { lockBodyScroll, clearBodyScrollLocks } =
      await import("./bodyScrollLock");
    lockBodyScroll();
    lockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");

    clearBodyScrollLocks();
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");

    // Fresh lock after clear should work again
    const unlock = lockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");
    unlock();
  });

  it("returns a no-op unlock when document is undefined", async () => {
    const originalDocument = globalThis.document;
    // @ts-expect-error simulate SSR
    delete globalThis.document;

    const { lockBodyScroll, clearBodyScrollLocks } =
      await import("./bodyScrollLock");
    const unlock = lockBodyScroll();
    expect(typeof unlock).toBe("function");
    expect(() => unlock()).not.toThrow();
    expect(() => clearBodyScrollLocks()).not.toThrow();

    globalThis.document = originalDocument;
  });
});
