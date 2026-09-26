"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Recovery intent from query string or hash (Supabase may use either). */
export function isRecoveryAuthUrl(search = "", hash = ""): boolean {
  const params = new URLSearchParams(search);
  if (params.get("type") === "recovery") return true;
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  return hashParams.get("type") === "recovery";
}

/**
 * Exchange PKCE code / verify token_hash and let the client parse hash sessions.
 * Returns true when a session exists after processing.
 */
export async function completeAuthSessionFromUrl(
  supabase: SupabaseClient,
  opts?: { search?: string; hash?: string },
): Promise<{ ok: boolean; error?: string }> {
  const search = opts?.search ?? window.location.search;
  const hash = opts?.hash ?? window.location.hash;
  const params = new URLSearchParams(search);
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { ok: false, error: error.message };
  }

  if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (error) return { ok: false, error: error.message };
  }

  // createBrowserClient may still be parsing #access_token from the hash.
  for (let i = 0; i < 8; i++) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) return { ok: true };

    const hashType = new URLSearchParams(hash.replace(/^#/, "")).get("type");
    if (hash && (hash.includes("access_token") || hashType === "recovery")) {
      await new Promise((r) => setTimeout(r, 150));
      continue;
    }
    break;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? { ok: true } : { ok: false };
}

export const AUTH_RECOVERY_PATH = "/auth/update-password";

export function authRecoveryRedirectUrl(
  origin = typeof window !== "undefined" ? window.location.origin : "",
): string {
  return `${origin}${AUTH_RECOVERY_PATH}`;
}
