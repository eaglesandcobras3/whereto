import { NextRequest, NextResponse } from "next/server";
import { handleFreeOnboardRemovalRequest } from "@/lib/listing-requests/handle-free-onboard-removal";
import { handleFreeOnboardListingRequest } from "@/lib/listing-requests/handle-free-onboard-submit";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = getServiceSupabaseOrNull();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Something went wrong validating your request. Try again shortly or email add@whereto30a.com.",
      },
      { status: 503 },
    );
  }

  if (
    json != null &&
    typeof json === "object" &&
    (json as { intent?: unknown }).intent === "removal"
  ) {
    return handleFreeOnboardRemovalRequest(request, json, supabase);
  }

  return handleFreeOnboardListingRequest(request, json, supabase);
}
