import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Legacy search API removed. Use /discover instead." },
    {
      status: 410,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    },
  );
}
