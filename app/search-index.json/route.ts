import { NextResponse } from "next/server";
import { buildWebSearchIndex } from "@/lib/siteSearchIndex";

/** Built once at deploy; the header search fetches it the first time it opens. */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(buildWebSearchIndex(), {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
