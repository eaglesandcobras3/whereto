import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = 86400;

/** Serves IndexNow key verification body (rewritten from `/{INDEXNOW_KEY}.txt`). */
export async function GET() {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    return new NextResponse("Not configured", { status: 404 });
  }

  return new NextResponse(`${key}\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
