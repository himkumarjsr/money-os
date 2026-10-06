import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";

function bearerToken(): string | null {
  try {
    const auth = headers().get("authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return null;
    return auth.slice("Bearer ".length).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Supabase client acting as the caller. The native app has no cookies, so it
 * sends `Authorization: Bearer <access_token>`; queries then run under that
 * user's RLS and `auth.getUser()` validates the token.
 */
function createBearerClient(token: string) {
  const client = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(),
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
  const getUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = (jwt?: string) => getUser(jwt ?? token);
  return client;
}

/** Route Handlers / Server Components that must read the logged-in user (cookie session, or Bearer token from the app). */
export async function createSupabaseServerClient() {
  const token = bearerToken();
  if (token) return createBearerClient(token);

  const cookieStore = cookies();

  return createServerClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet, _headers) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component context cannot mutate cookies — rely on middleware / route handlers.
          }
        },
      },
    },
  );
}

let adminSingleton: SupabaseClient | null = null;

/** Service role client — server-only; never import from client bundles. */
export function getSupabaseAdmin(): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for admin operations");
  }
  if (!adminSingleton) {
    adminSingleton = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminSingleton;
}

/** @deprecated Prefer `getSupabaseAdmin()` — lazily created singleton */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});
