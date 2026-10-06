import { NextResponse } from "next/server";

/**
 * Served at /.well-known/assetlinks.json (see next.config rewrites) so Android
 * verifies https://…/split/join links for the native app. Set
 * ANDROID_APP_CERT_SHA256 to the signing certificate fingerprint(s) from
 * `eas credentials` (comma-separated, AA:BB:… form).
 */
export const dynamic = "force-dynamic";

export function GET() {
  const fingerprints = (process.env.ANDROID_APP_CERT_SHA256 ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);
  if (fingerprints.length === 0) {
    return NextResponse.json([], { status: 404 });
  }
  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.finkoin.app",
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
