import { type NextRequest, NextResponse } from "next/server";

/**
 * Supabase hash fragments (#access_token=..., type=invite, etc.) are not available
 * in middleware or Route Handlers — only in the browser. Client pages under
 * /auth/callback and /login finish the session (see exchangeCodeForSession +
 * getSession / onAuthStateChange there).
 *
 * PKCE uses ?code= in the query string; the callback page exchanges it client-side.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip all Next internals (static chunks, HMR, image optimizer, etc.) — avoids extra work on chunk requests.
    "/((?!_next/|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
