/**
 * The "Why Finkoin" intro tour - port of web lib/introTour.ts. A ~30 second
 * animated video of the key features (components/IntroTourVideo.tsx). It
 * plays once on a new install and any "Watch the tour" button opens it again
 * through {@link openIntroTour}.
 */
import { create } from "zustand";
import { syncKv } from "@/lib/syncKv";

export const INTRO_TOUR_SEEN_KEY = "finkoin_intro_tour_seen";

type IntroTourState = {
  /** What opened the tour ("auto", "home_hero", ...); null when closed. */
  source: string | null;
};

export const useIntroTourStore = create<IntroTourState>(() => ({
  source: null,
}));

export function hasSeenIntroTour(): boolean {
  return syncKv.getItem(INTRO_TOUR_SEEN_KEY) != null;
}

export function markIntroTourSeen(): void {
  syncKv.setItem(INTRO_TOUR_SEEN_KEY, Date.now().toString());
}

export function openIntroTour(source: string): void {
  useIntroTourStore.setState({ source });
}

export function closeIntroTour(): void {
  useIntroTourStore.setState({ source: null });
}

/**
 * True while the tour is on screen or still due to auto-play this launch.
 * The morning tip and push prompt skip the launch rather than stack on it.
 */
export function introTourBlocksPopups(): boolean {
  return useIntroTourStore.getState().source != null || !hasSeenIntroTour();
}
