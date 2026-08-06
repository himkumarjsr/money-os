import "@/lib/cryptoPolyfill";
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { appStorage } from "@/lib/storage";

const extra = Constants.expoConfig?.extra as
  | { supabaseUrl?: string; supabaseAnonKey?: string }
  | undefined;

const supabaseUrl = (
  extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  ""
).trim();
const supabaseAnonKey = (
  extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  ""
).trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY",
  );
}

/**
 * No-op process lock. Supabase's default navigator/lock can hang forever on
 * React Native when auth methods are nested (password sign-in freezes).
 */
async function rnAuthLock<R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  return fn();
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
  {
    auth: {
      storage: appStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      lock: rnAuthLock,
    },
  },
);

export function getSupabase() {
  return supabase;
}

export function isSupabaseConfigured() {
  return Boolean(
    supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http"),
  );
}
