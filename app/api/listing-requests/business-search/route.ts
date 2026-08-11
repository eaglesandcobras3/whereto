import { NextRequest, NextResponse } from "next/server";
import { getAllFeatureFlags, isFreeOnboardEnabled } from "@/lib/feature-flags";
import {
  INTAKE_BUSINESS_SEARCH_MIN_QUERY,
  searchBusinessesForIntake,
} from "@/lib/listing-requests/search-businesses-for-intake";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

/** Typeahead search for verify/find existing listings on free intake. */
export async function GET(request: NextRequest) {
  const flags = await getAllFeatureFlags();
  if (!isFreeOnboardEnabled(flags)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < INTAKE_BUSINESS_SEARCH_MIN_QUERY) {
    return NextResponse.json({ businesses: [] });
  }

  const supabase = getServiceSupabaseOrNull();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const businesses = await searchBusinessesForIntake(supabase, q);
    return NextResponse.json({ businesses });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
