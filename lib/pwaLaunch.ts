/** True when running inside the installed Finkoin PWA shell. */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function isAndroidUserAgent(ua = ""): boolean {
  return /Android/i.test(
    ua || (typeof navigator !== "undefined" ? navigator.userAgent : ""),
  );
}

export function isIosUserAgent(ua = ""): boolean {
  const agent =
    ua || (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return /iPhone|iPad|iPod/i.test(agent);
}

export function isMobileUserAgent(ua = ""): boolean {
  return isAndroidUserAgent(ua) || isIosUserAgent(ua);
}

/**
 * Leave in-app browsers (WhatsApp etc.) and ask Android to open the HTTPS URL.
 * Installed Chrome WebAPKs register for in-scope links and often win the chooser.
 * Returns false when not on Android or the URL cannot be built.
 */
export function tryOpenHttpsInAndroidApp(absoluteUrl: string): boolean {
  if (typeof window === "undefined") return false;
  if (!isAndroidUserAgent()) return false;
  try {
    const u = new URL(absoluteUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const fallback = encodeURIComponent(u.toString());
    const path = `${u.host}${u.pathname}${u.search}${u.hash}`;
    const intent =
      `intent://${path}` +
      `#Intent;scheme=${u.protocol.replace(":", "")}` +
      `;action=android.intent.action.VIEW` +
      `;category=android.intent.category.BROWSABLE` +
      `;S.browser_fallback_url=${fallback};end`;
    window.location.href = intent;
    return true;
  } catch {
    return false;
  }
}

const OPEN_ATTEMPT_KEY = "finkoin_pwa_open_attempted";

export function markPwaOpenAttempted(joinKey: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(OPEN_ATTEMPT_KEY, joinKey);
}

export function hasPwaOpenAttempted(joinKey: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(OPEN_ATTEMPT_KEY) === joinKey;
}

/**
 * Offer “open in installed PWA” only on real mobile browsers.
 * Desktop + localhost always stay in the normal browser join / login path.
 */
export function shouldOfferOpenInApp(opts?: {
  hostname?: string;
  userAgent?: string;
  standalone?: boolean;
}): boolean {
  const standalone =
    opts?.standalone ??
    (typeof window !== "undefined" ? isStandalonePwa() : false);
  if (standalone) return false;

  const ua =
    opts?.userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "");
  if (!isMobileUserAgent(ua)) return false;

  const host =
    opts?.hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "");
  if (host === "localhost" || host === "127.0.0.1") return false;
  return true;
}
