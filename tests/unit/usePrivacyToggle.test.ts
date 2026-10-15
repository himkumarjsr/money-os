import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePrivacyToggle } from "@/lib/usePrivacyToggle";

describe("usePrivacyToggle", () => {
  it("hides a card even while the master switch shows all", () => {
    const { result, rerender } = renderHook(
      ({ force }) => usePrivacyToggle(force),
      { initialProps: { force: true } },
    );
    expect(result.current[0]).toBe(true);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
    // Flipping the master switch takes over again.
    rerender({ force: false });
    expect(result.current[0]).toBe(false);
    rerender({ force: true });
    expect(result.current[0]).toBe(true);
  });

  it("toggles on its own when the master switch is off", () => {
    const { result } = renderHook(() => usePrivacyToggle(false));
    expect(result.current[0]).toBe(false);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
  });
});
