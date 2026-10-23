/**
 * The "Why Finkoin" intro tour: a ~30 second animated video of the key
 * features (components/IntroTourVideo.tsx). It plays once on a new device's
 * first visit to the home page or dashboard, and any "Watch the tour" button
 * can open it again through {@link openIntroTour}.
 */

export const INTRO_TOUR_SEEN_KEY = "finkoin_intro_tour_seen";
export const INTRO_TOUR_OPEN_EVENT = "finkoin:open-intro-tour";

/** Pages where a first-time visitor gets the tour without asking. */
export const INTRO_TOUR_AUTO_PATHS = ["/", "/dashboard"] as const;

/** Set on <body> while the tour is open, so other popups can wait. */
const OPEN_ATTR = "data-intro-tour-open";

export function hasSeenIntroTour(): boolean {
  try {
    return localStorage.getItem(INTRO_TOUR_SEEN_KEY) != null;
  } catch {
    // Storage blocked (private mode): don't nag on every visit.
    return true;
  }
}

export function markIntroTourSeen(): void {
  try {
    localStorage.setItem(INTRO_TOUR_SEEN_KEY, Date.now().toString());
  } catch {
    /* storage blocked */
  }
}

export function shouldAutoShowIntroTour(
  pathname: string | null,
  opts: { seen: boolean; automated: boolean },
): boolean {
  if (opts.seen || opts.automated) return false;
  return (INTRO_TOUR_AUTO_PATHS as readonly string[]).includes(pathname ?? "");
}

export function openIntroTour(source: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(INTRO_TOUR_OPEN_EVENT, { detail: { source } }),
  );
}

export function setIntroTourOpen(open: boolean): void {
  if (typeof document === "undefined") return;
  if (open) document.body.setAttribute(OPEN_ATTR, "true");
  else document.body.removeAttribute(OPEN_ATTR);
}

/** Morning tip / push prompt skip this visit while the tour is on screen. */
export function isIntroTourOpen(): boolean {
  if (typeof document === "undefined") return false;
  return document.body.hasAttribute(OPEN_ATTR);
}
