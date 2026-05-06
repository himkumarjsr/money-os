/**
 * Client-side context appended to GA4 hits. Country/city are **not** sent from the browser;
 * GA4 derives geography from the collecting endpoint (IP-based) in standard reports.
 */

export type AnalyticsSurface = "pwa" | "browser";

export type DeviceCategory = "mobile" | "tablet" | "desktop";

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max);
}

export function getAppSurface(): AnalyticsSurface {
  if (typeof window === "undefined") return "browser";
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return "pwa";
    if (window.matchMedia("(display-mode: minimal-ui)").matches) return "pwa";
    const nav = navigator as Navigator & { standalone?: boolean };
    if (nav.standalone === true) return "pwa";
  } catch {
    /* ignore */
  }
  return "browser";
}

export function getDeviceCategory(): DeviceCategory {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

/** Coarse location proxy (no GPS). GA4 Demographics / Geo uses IP separately. */
export function getAnalyticsContext(): Record<string, string | number | undefined> {
  if (typeof window === "undefined") return {};

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = navigator.language;
  const langs = typeof navigator.languages !== "undefined" ? navigator.languages.join(",") : lang;

  let referrer_hostname = "";
  try {
    const ref = document.referrer;
    if (ref) referrer_hostname = truncate(new URL(ref).hostname, 120);
  } catch {
    referrer_hostname = "";
  }

  const { innerWidth: vw, innerHeight: vh } = window;
  const dpr = typeof window.devicePixelRatio !== "undefined" ? window.devicePixelRatio : 1;

  let connection_type: string | undefined;
  try {
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    connection_type = conn?.effectiveType;
  } catch {
    connection_type = undefined;
  }

  return {
    app_surface: getAppSurface(),
    device_category: getDeviceCategory(),
    timezone: truncate(tz, 80),
    language: truncate(lang, 32),
    languages: truncate(langs, 120),
    referrer_hostname: referrer_hostname || "(direct)",
    viewport_w: vw,
    viewport_h: vh,
    screen_density: Math.round(dpr * 100) / 100,
    ...(connection_type ? { connection_type: truncate(connection_type, 32) } : {}),
  };
}
