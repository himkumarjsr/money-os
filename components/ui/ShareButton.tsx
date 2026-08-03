"use client";

import { cn } from "@/lib/cn";
import { trackShare } from "@/lib/gtag";
import { SITE_URL } from "@/lib/seo";
import { useCallback, useEffect, useState } from "react";

type ShareButtonProps = {
  title: string;
  /** Absolute URL or path starting with `/`. */
  url?: string;
  /** Path starting with `/` — resolved against origin / SITE_URL. */
  path?: string;
  contentType?: string;
  contentId?: string;
  className?: string;
  /** Compact icon-only control for tight headers. */
  compact?: boolean;
  text?: string;
};

function resolveShareUrl(url?: string, path?: string): string {
  if (url && /^https?:\/\//i.test(url)) return url;
  const p = path || url || "/";
  const normalized = p.startsWith("/") ? p : `/${p}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${normalized}`;
  }
  return `${SITE_URL}${normalized}`;
}

/**
 * Share for PWA + browser: native sheet when available, else copy link.
 * Critical in standalone PWA where there is no address bar.
 */
export function ShareButton({
  title,
  url,
  path,
  contentType = "page",
  contentId,
  className,
  compact = false,
  text = "Share",
}: ShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared">("idle");
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  useEffect(() => {
    if (status === "idle") return;
    const t = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(t);
  }, [status]);

  const onShare = useCallback(async () => {
    const shareUrl = resolveShareUrl(url, path);
    const base = {
      content_type: contentType,
      content_id: contentId ?? path ?? shareUrl,
    };

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title,
            text: title,
            url: shareUrl,
          });
          trackShare({ method: "native_share", ...base, outcome: "completed" });
          setStatus("shared");
          return;
        } catch (e: unknown) {
          const name = e instanceof DOMException ? e.name : "";
          if (name === "AbortError") {
            trackShare({
              method: "native_share",
              ...base,
              outcome: "cancelled",
            });
            return;
          }
          trackShare({ method: "native_share", ...base, outcome: "failed" });
        }
      }
    } catch {
      trackShare({ method: "native_share", ...base, outcome: "failed" });
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      trackShare({ method: "clipboard", ...base, outcome: "completed" });
      setStatus("copied");
    } catch {
      trackShare({ method: "fallback_prompt", ...base, outcome: "failed" });
      window.prompt("Copy this link:", shareUrl);
    }
  }, [contentId, contentType, path, title, url]);

  const label =
    status === "copied"
      ? "Link copied"
      : status === "shared"
        ? "Shared"
        : canNativeShare
          ? text
          : "Copy link";

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]",
        compact ? "h-9 min-w-9 px-2.5 text-xs" : "min-h-10 px-3.5 py-2 text-sm",
        status !== "idle" &&
          "border-emerald-200 bg-emerald-50 text-emerald-800",
        className,
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={compact ? "size-4" : "size-4"}
        aria-hidden
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.59 13.51 15.42 17.49" />
        <path d="m15.41 6.51-6.82 3.98" />
      </svg>
      {compact && status === "idle" ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}
