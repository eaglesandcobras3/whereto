import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { cronLegacyDisabledResponse } from "@/lib/cron-legacy-disabled";

export async function GET(request: NextRequest) {
  try {
    assertCronAuthorized(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return cronLegacyDisabledResponse("scores");
}
