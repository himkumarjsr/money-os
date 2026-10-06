import { isAndroidUserAgent, isIosUserAgent, isStandalonePwa } from "@/lib/pwaLaunch";

/** Native app identifiers — must match mobile/app.json. */
export const NATIVE_APP_SCHEME = "finkoin";
export const NATIVE_ANDROID_PACKAGE = "com.finkoin.app";

/** Store listings; unset until the app is live in that store. */
export function nativeAppStoreUrl(ua = ""): string | null {
  const agent = ua || globalThis.navigator?.userAgent || "";
  const url = isAndroidUserAgent(agent)
    ? process.env.NEXT_PUBLIC_PLAY_STORE_URL
    : isIosUserAgent(agent)
      ? process.env.NEXT_PUBLIC_APP_STORE_URL
      : undefined;
  return url?.trim() || null;
}

/** `finkoin://split/join?token=…` for a site-relative path. */
export function nativeAppUrl(pathAndQuery: string): string {
  return `${NATIVE_APP_SCHEME}://${pathAndQuery.replace(/^\/+/, "")}`;
}

/**
 * Chrome intent that opens the installed app at `pathAndQuery`, or navigates to
 * `fallbackUrl` (store listing or the web page) when it isn't installed.
 */
export function androidAppIntentUrl(
  pathAndQuery: string,
  fallbackUrl: string,
): string {
  return (
    `intent://${pathAndQuery.replace(/^\/+/, "")}` +
    `#Intent;scheme=${NATIVE_APP_SCHEME}` +
    `;package=${NATIVE_ANDROID_PACKAGE}` +
    `;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`
  );
}

/**
 * Whether to try handing a link off to the native app. Android always (the
 * intent falls back by itself); iOS only when an App Store URL is set, since a
 * missing app can't be detected there without a fallback to send people to.
 */
export function shouldTryNativeApp(opts?: {
  hostname?: string;
  userAgent?: string;
  standalone?: boolean;
}): boolean {
  const w = globalThis.window;
  const standalone = opts?.standalone ?? (w ? isStandalonePwa() : false);
  if (standalone) return false;
  const host = opts?.hostname ?? w?.location.hostname ?? "";
  if (host === "localhost" || host === "127.0.0.1") return false;
  const ua = opts?.userAgent ?? globalThis.navigator?.userAgent ?? "";
  if (isAndroidUserAgent(ua)) return true;
  if (isIosUserAgent(ua)) return Boolean(nativeAppStoreUrl(ua));
  return false;
}

const ATTEMPT_KEY = "finkoin_native_open_attempted";

export function hasNativeOpenAttempted(key: string): boolean {
  return globalThis.sessionStorage?.getItem(ATTEMPT_KEY) === key;
}

export function markNativeOpenAttempted(key: string) {
  globalThis.sessionStorage?.setItem(ATTEMPT_KEY, key);
}

/**
 * Try to open the native app. Resolves true when the page was backgrounded
 * (app opened); false when nothing happened (e.g. an in-app browser ignored
 * the intent). A store / web fallback navigation unloads the page instead.
 */
export function openNativeApp(
  pathAndQuery: string,
  webFallbackUrl: string,
  waitMs = 1600,
): Promise<boolean> {
  const w = globalThis.window;
  const doc = globalThis.document;
  if (!w || !doc) return Promise.resolve(false);
  const store = nativeAppStoreUrl();

  return new Promise((resolve) => {
    let left = false;
    const onHide = () => {
      if (doc.hidden) left = true;
    };
    doc.addEventListener("visibilitychange", onHide);
    w.addEventListener("pagehide", onHide);

    if (isAndroidUserAgent()) {
      w.location.href = androidAppIntentUrl(
        pathAndQuery,
        store ?? webFallbackUrl,
      );
    } else {
      w.location.href = nativeAppUrl(pathAndQuery);
    }

    w.setTimeout(() => {
      doc.removeEventListener("visibilitychange", onHide);
      w.removeEventListener("pagehide", onHide);
      if (!left && !doc.hidden && isIosUserAgent() && store) {
        w.location.href = store;
        return;
      }
      resolve(left || doc.hidden);
    }, waitMs);
  });
}
