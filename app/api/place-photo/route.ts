import { NextResponse } from "next/server";

/**
 * Deprecated: listing images are served from Supabase Storage (`hero_image_url`), synced by cron only.
 */
export async function GET() {
  return new NextResponse(
    "Gone: listing images are cached in Storage; use hero_image_url from the API/DB.",
    {
      status: 410,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    },
  );
}
