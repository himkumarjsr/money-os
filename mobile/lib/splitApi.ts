/**
 * Calls the web app's /api/split/* routes with the Supabase access token, so
 * mobile gets the same server-side checks and notifications as the PWA.
 */
import { getSupabase } from "@/lib/supabase";

const TIMEOUT_MS = 20_000;

export function siteBase(): string {
  return (process.env.EXPO_PUBLIC_SITE_URL || "https://www.finkoin.com").replace(
    /\/$/,
    "",
  );
}

export type SplitApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      error: string;
      data: Record<string, unknown>;
      /**
       * The server never handled the request (no route, token not accepted,
       * offline) — safe to fall back to a direct write without duplicating.
       */
      unavailable: boolean;
    };

export async function splitApi<T = Record<string, unknown>>(
  path: string,
  init: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    query?: Record<string, string | undefined>;
  } = {},
): Promise<SplitApiResult<T>> {
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  const token = session?.access_token;
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Sign in again to continue.",
      data: {},
      unavailable: false,
    };
  }

  const qs = Object.entries(init.query ?? {})
    .filter((e): e is [string, string] => e[1] != null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const url = `${siteBase()}${path}${qs ? `?${qs}` : ""}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(init.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      status: 0,
      error: aborted
        ? "Request timed out. Check your connection and try again."
        : "Network error. Check your connection and try again.",
      data: {},
      unavailable: !aborted,
    };
  } finally {
    clearTimeout(timer);
  }

  let json: Record<string, unknown> | null = null;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = null;
  }

  if (res.ok && json) return { ok: true, data: json as T };

  return {
    ok: false,
    status: res.status,
    error:
      (typeof json?.error === "string" && json.error) ||
      `Request failed (${res.status})`,
    data: json ?? {},
    unavailable: res.status === 401 || (res.status === 404 && !json),
  };
}
