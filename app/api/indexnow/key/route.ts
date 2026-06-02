import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Serves IndexNow key verification body (rewritten from `/{INDEXNOW_KEY}.txt`). */
export async function GET() {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    return new NextResponse("Not configured", { status: 404 });
  }

  return new NextResponse(`${key}\n`, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
