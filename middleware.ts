import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  /** Marketing shell: avoid Supabase round-trip on first paint (critical path / LCP). */
  if (request.nextUrl.pathname === "/") {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => supabaseResponse.headers.set(key, value));
      },
    },
  });

  const protectedPaths = [
    "/tracker",
    "/analyse/fixplan",
    "/profile",
    "/policies",
    "/rewards",
    "/goals",
    "/investments",
    "/leaderboard",
    "/refer",
    "/settings",
  ];
  const isProtected = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  // Validates JWT and refreshes session / rotates refresh cookie when needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    const refParam = request.nextUrl.searchParams.get("ref");
    if (refParam) {
      loginUrl.searchParams.set("ref", refParam);
    }
    const redirectResponse = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|sw\\.js|workbox-[^/]+\\.js|worker-[^/]+\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
