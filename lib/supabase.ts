import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isConfigured = !!(supabaseUrl && supabaseAnonKey);
export const isSupabaseConfigured = isConfigured;

let supabaseInstance: SupabaseClient | null = null;

/**
 * Browser-only Supabase client (@supabase/ssr).
 * Uses cookie-backed session storage compatible with middleware refresh.
 */
export function getSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getSupabase() must be called from the browser");
  }
  if (!isConfigured) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

/**
 * Lazy proxy so existing `supabase.auth.*` call sites keep working (client-only).
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, _receiver) {
    const client = getSupabase();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});

export default getSupabase;
