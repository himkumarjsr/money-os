import { supabase } from "@/lib/supabase";
import { siteBase } from "@/lib/googleAuth";

/**
 * Calls the web app's account-deletion API with the current session's
 * access token (mobile has no cookies, so this is a Bearer-token call —
 * the only API route in this app mobile authenticates this way).
 */
export async function deleteMyAccount(): Promise<{ error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { error: "You're not signed in." };

  try {
    const res = await fetch(`${siteBase()}/api/account/delete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        error:
          typeof data?.error === "string"
            ? data.error
            : "Could not delete your account.",
      };
    }
    return {};
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not reach the server.",
    };
  }
}
