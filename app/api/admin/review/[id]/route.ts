import { NextRequest, NextResponse } from "next/server";
import { reviewApiBlocked } from "@/lib/feature-flags";
import {
  approveAllFreeLocations,
  createFreeListingForLocation,
  skipFreeListingLocation,
} from "@/lib/listing-requests/free-onboard-queue";
import { FREE_ONBOARD_TYPES } from "@/lib/listing-requests/free-onboard-schema";
import { approveReviewItem, needsChangesReviewItem, rejectReviewItem } from "@/lib/portal/review-queue";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const blocked = await reviewApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  let body: {
    action?: string;
    admin_notes?: string;
    location_id?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "").trim();
  const adminNotes = String(body.admin_notes ?? "").trim().slice(0, 2000) || null;
  const locationId = typeof body.location_id === "string" ? body.location_id.trim() : "";

  const supabase = getServiceSupabase();

  try {
    if (action === "create_location") {
      if (!locationId) {
        return NextResponse.json({ error: "location_id required" }, { status: 400 });
      }
      const result = await createFreeListingForLocation(supabase, id, locationId, admin.userId);
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === "skip_location") {
      if (!locationId) {
        return NextResponse.json({ error: "location_id required" }, { status: 400 });
      }
      const result = await skipFreeListingLocation(supabase, id, locationId, admin.userId);
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === "approve_all_locations") {
      const result = await approveAllFreeLocations(supabase, id, admin.userId);
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === "approve") {
      await approveReviewItem(supabase, id, admin.userId);
      return NextResponse.json({ ok: true, status: "approved" });
    }
    if (action === "reject") {
      await rejectReviewItem(supabase, id, admin.userId, adminNotes);
      return NextResponse.json({ ok: true, status: "rejected" });
    }
    if (action === "needs_changes") {
      const { data: item } = await supabase
        .from("portal_review_items")
        .select("type")
        .eq("id", id)
        .maybeSingle();
      if (
        item?.type === FREE_ONBOARD_TYPES.newListing ||
        item?.type === FREE_ONBOARD_TYPES.update
      ) {
        return NextResponse.json(
          { error: "Use reject for free intake, or create/skip locations." },
          { status: 400 },
        );
      }
      if (!adminNotes) {
        return NextResponse.json({ error: "Add a note explaining what to change." }, { status: 400 });
      }
      await needsChangesReviewItem(supabase, id, admin.userId, adminNotes);
      return NextResponse.json({ ok: true, status: "needs_changes" });
    }
    return NextResponse.json(
      {
        error:
          "action must be approve, reject, needs_changes, create_location, skip_location, or approve_all_locations",
      },
      { status: 400 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Review action failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
