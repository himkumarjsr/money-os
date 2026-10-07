"use client";

import { getSupabase } from "@/lib/supabase";

/**
 * `fetch` for our own `/api/*` routes. Adds the session's access token as a
 * Bearer header (the server accepts it alongside cookies), so API calls still
 * authenticate when the auth cookie was dropped by a refresh race between
 * middleware and the browser client.
 */
export async function apiFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Authorization")) {
    try {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
    } catch {
      /* not signed in / Supabase not configured — cookies only */
    }
  }
  return fetch(input, { ...init, headers });
}
