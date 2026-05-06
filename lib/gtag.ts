/**
 * GA4 helpers. Loaded only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set (G-xxxxxxxxxx).
 * Every event is enriched with device / PWA / viewport context from {@link getAnalyticsContext}.
 * City/country appear in GA4 Geo reports from Google's IP processing — not set here.
 */

import { getAnalyticsContext } from "@/lib/analyticsContext";

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

export function isGaEnabled(): boolean {
  return GA_MEASUREMENT_ID.length > 0;
}

function mergeParams(params?: Record<string, unknown>): Record<string, unknown> {
  const ctx = typeof window !== "undefined" ? getAnalyticsContext() : {};
  return { ...ctx, ...(params ?? {}) };
}

/** GA4 custom or recommended events (snake_case params recommended). */
export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (!isGaEnabled() || typeof window === "undefined") return;
  window.gtag?.("event", eventName, mergeParams(params));
}

/** Primary CTAs — event name `cta_click`. */
export function trackCta(payload: {
  cta_name: string;
  cta_location: string;
  href?: string;
  [key: string]: string | undefined;
}): void {
  trackEvent("cta_click", {
    ...payload,
  });
}

/** Section or component entered viewport (IntersectionObserver). */
export function trackImpression(component_id: string, params?: Record<string, unknown>): void {
  trackEvent("element_impression", {
    component_id,
    ...params,
  });
}

/** Scroll-depth milestones (see AnalyticsBehavior). */
export function trackScrollDepth(depth_percent: number, page_path: string): void {
  trackEvent("scroll_depth", {
    depth_percent,
    page_path,
  });
}

/**
 * Share outcomes (native share sheet, clipboard, WhatsApp).
 * Maps toward GA4 recommended `share` event shape.
 */
export function trackShare(payload: {
  method: "native_share" | "clipboard" | "whatsapp" | "fallback_prompt";
  content_type: string;
  content_id?: string;
  outcome: "completed" | "cancelled" | "failed";
}): void {
  trackEvent("share", {
    method: payload.method,
    content_type: payload.content_type,
    item_id: payload.content_id,
    share_outcome: payload.outcome,
  });
}

/** Calculator or multi-tool workspace opened / switched. */
export function trackToolOpen(payload: {
  tool_category: string;
  tool_id: string;
  tool_name: string;
}): void {
  trackEvent("tool_open", payload);
}

/** Header / mobile drawer link taps (href captured). */
export function trackNavClick(link_href: string, nav_zone: string): void {
  trackEvent("nav_click", { link_href, nav_zone });
}
