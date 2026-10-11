/**
 * Records today's login with the web API (streak + daily points). The PWA
 * calls this from its gamification store; mobile has no cookies, so it sends
 * the Supabase access token as a Bearer token. Fire and forget.
 */
import { supabase } from "@/lib/supabase";
import { siteBase } from "@/lib/splitApi";

const pinged = new Set<string>();

export function pingDailyLogin(userId: string | null | undefined): void {
  if (!userId || pinged.has(userId)) return;
  pinged.add(userId);
  void (async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        pinged.delete(userId);
        return;
      }
      await fetch(`${siteBase()}/api/gamification/daily-login`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // best effort; the next app session tries again
    }
  })();
}
