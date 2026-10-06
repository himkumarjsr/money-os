import { NextResponse } from "next/server";

/**
 * Served at /.well-known/apple-app-site-association (see next.config rewrites)
 * so iOS opens https://…/split/join links in the native app. Set APPLE_TEAM_ID
 * to the Apple Developer Team ID used for the EAS iOS build.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const teamId = (process.env.APPLE_TEAM_ID ?? "").trim();
  if (!teamId) {
    return NextResponse.json({}, { status: 404 });
  }
  const appId = `${teamId}.com.finkoin.app`;
  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appIDs: [appId],
            appID: appId,
            components: [{ "/": "/split/join*" }],
            paths: ["/split/join*"],
          },
        ],
      },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
