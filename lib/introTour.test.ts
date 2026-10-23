import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INTRO_TOUR_OPEN_EVENT,
  hasSeenIntroTour,
  isIntroTourOpen,
  markIntroTourSeen,
  openIntroTour,
  setIntroTourOpen,
  shouldAutoShowIntroTour,
} from "./introTour";

afterEach(() => {
  localStorage.clear();
  setIntroTourOpen(false);
});

describe("shouldAutoShowIntroTour", () => {
  const fresh = { seen: false, automated: false };

  it("plays for a new visitor on home and dashboard", () => {
    expect(shouldAutoShowIntroTour("/", fresh)).toBe(true);
    expect(shouldAutoShowIntroTour("/dashboard", fresh)).toBe(true);
  });

  it("stays out of calculators, blog and other entry pages", () => {
    expect(shouldAutoShowIntroTour("/calculators/sip", fresh)).toBe(false);
    expect(shouldAutoShowIntroTour("/blog", fresh)).toBe(false);
    expect(shouldAutoShowIntroTour(null, fresh)).toBe(false);
  });

  it("never plays twice or under test automation", () => {
    expect(shouldAutoShowIntroTour("/", { seen: true, automated: false })).toBe(
      false,
    );
    expect(shouldAutoShowIntroTour("/", { seen: false, automated: true })).toBe(
      false,
    );
  });
});

describe("seen flag", () => {
  it("is remembered on the device", () => {
    expect(hasSeenIntroTour()).toBe(false);
    markIntroTourSeen();
    expect(hasSeenIntroTour()).toBe(true);
  });
});

describe("open state", () => {
  it("dispatches the open event with its source", () => {
    const handler = vi.fn();
    window.addEventListener(INTRO_TOUR_OPEN_EVENT, handler);
    openIntroTour("features_hero");
    window.removeEventListener(INTRO_TOUR_OPEN_EVENT, handler);
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0]![0] as CustomEvent).detail).toEqual({
      source: "features_hero",
    });
  });

  it("tracks whether the tour is on screen", () => {
    expect(isIntroTourOpen()).toBe(false);
    setIntroTourOpen(true);
    expect(isIntroTourOpen()).toBe(true);
  });
});
