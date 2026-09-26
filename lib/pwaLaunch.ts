/** True when running inside the installed Finkoin PWA shell. */
export function isStandalonePwa(): boolean {
  const w = globalThis.window;
  if (!w) return false;
  if (w.matchMedia("(display-mode: standalone)").matches) return true;
  if (w.matchMedia("(display-mode: minimal-ui)").matches) return true;
  const nav = globalThis.navigator as Navigator & { standalone?: boolean };
  return nav?.standalone === true;
}

export function isAndroidUserAgent(ua = ""): boolean {
  return /Android/i.test(ua || globalThis.navigator?.userAgent || "");
}

export function isIosUserAgent(ua = ""): boolean {
  const agent = ua || globalThis.navigator?.userAgent || "";
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
  const w = globalThis.window;
  if (!w) return false;
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
    w.location.href = intent;
    return true;
  } catch {
    return false;
  }
}

const OPEN_ATTEMPT_KEY = "finkoin_pwa_open_attempted";

export function markPwaOpenAttempted(joinKey: string) {
  const store = globalThis.sessionStorage;
  if (!store) return;
  store.setItem(OPEN_ATTEMPT_KEY, joinKey);
}

export function hasPwaOpenAttempted(joinKey: string): boolean {
  const store = globalThis.sessionStorage;
  if (!store) return false;
  return store.getItem(OPEN_ATTEMPT_KEY) === joinKey;
}

/**
 * Offer “open in installed PWA” only where we can deep-link with the invite URL.
 *
 * Android: `intent://` can open the installed WebAPK/TWA on `/split/join?token=…`.
 * iOS: home-screen PWAs cannot be opened with a path/query, and Safari / WhatsApp
 * WebView storage is siloed from the PWA — so “save invite, open app” never works.
 * iOS always continues the join in the browser instead.
 *
 * Desktop + localhost always stay on the normal browser join / login path.
 */
export function shouldOfferOpenInApp(opts?: {
  hostname?: string;
  userAgent?: string;
  standalone?: boolean;
}): boolean {
  const w = globalThis.window;
  const standalone = opts?.standalone ?? (w ? isStandalonePwa() : false);
  if (standalone) return false;

  const ua = opts?.userAgent ?? globalThis.navigator?.userAgent ?? "";
  // iOS cannot hand off invite URLs into the PWA — skip the dead-end prompt.
  if (isIosUserAgent(ua)) return false;
  if (!isAndroidUserAgent(ua)) return false;

  const host = opts?.hostname ?? w?.location.hostname ?? "";
  if (host === "localhost" || host === "127.0.0.1") return false;
  return true;
}
