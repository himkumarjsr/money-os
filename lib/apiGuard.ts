import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { User } from "@supabase/supabase-js";

/**
 * Shared guards for API route handlers: session auth + a best-effort
 * in-memory rate limiter.
 *
 * NOTE: The rate limiter is per-instance (in-memory). On serverless it protects
 * a single warm instance, which meaningfully blunts bursts/abuse but is not a
 * global limit. For strict global limits back this with a shared store
 * (e.g. Upstash Redis) — the call sites stay the same.
 */

export async function getAuthedUser(): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

export function unauthorized(message = "Not authenticated") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function tooManyRequests(retryAfterSeconds = 60) {
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Fixed-window rate limit. Returns { ok, retryAfter }.
 * @param key unique caller+route key (e.g. `feedback:${userId}`)
 * @param limit max requests per window
 * @param windowMs window length in ms
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { ok: true, retryAfter: 0 };
}

/** Best-effort caller key from headers when there is no user session. */
export function clientKeyFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  return ip;
}

// Periodically drop expired buckets so the map cannot grow unbounded.
if (typeof setInterval !== "undefined") {
  const interval = setInterval(
    () => {
      const now = Date.now();
      for (const k of Array.from(buckets.keys())) {
        const v = buckets.get(k);
        if (v && now >= v.resetAt) buckets.delete(k);
      }
    },
    5 * 60 * 1000,
  );
  // Do not keep the process alive just for cleanup.
  (interval as unknown as { unref?: () => void }).unref?.();
}
