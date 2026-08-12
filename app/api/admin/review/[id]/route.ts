import { NextRequest, NextResponse } from "next/server";
import {
  getAllFeatureFlags,
  isBusinessPhotosFeatureEnabled,
  reviewApiBlocked,
} from "@/lib/feature-flags";
import {
  parseCategoryResolution,
  resolveSuggestedCategory,
} from "@/lib/listing-requests/apply-suggested-category";
import {
  parseSuggestedTagActions,
  promoteSelectedSuggestedTags,
} from "@/lib/listing-requests/apply-suggested-tags";
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
    apply_suggested_tags?: unknown;
    category_resolution?: unknown;
    is_explorable?: unknown;
    photo_includes?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "").trim();
  const adminNotes = String(body.admin_notes ?? "").trim().slice(0, 2000) || null;
  const locationId = typeof body.location_id === "string" ? body.location_id.trim() : "";
  const tagActions = parseSuggestedTagActions(body.apply_suggested_tags);
  const categoryResolution = parseCategoryResolution(body.category_resolution);
  const isExplorable =
    typeof body.is_explorable === "boolean" ? body.is_explorable : undefined;

  const supabase = getServiceSupabase();

  async function applySuggestionsIfRequested() {
    if (typeof isExplorable === "boolean") {
      const { data: item } = await supabase
        .from("portal_review_items")
        .select("payload, status")
        .eq("id", id)
        .maybeSingle();
      if (item && (item.status as string) === "pending") {
        const payload = {
          ...((item.payload as Record<string, unknown>) ?? {}),
          is_explorable: isExplorable,
        };
        const { error } = await supabase
          .from("portal_review_items")
          .update({ payload })
          .eq("id", id);
        if (error) throw new Error(error.message);
      }
    }
    if (categoryResolution) {
      await resolveSuggestedCategory(supabase, id, categoryResolution);
    }
    if (tagActions.length > 0) {
      await promoteSelectedSuggestedTags(supabase, id, tagActions);
    }
  }

  try {
    if (action === "set_photo_includes") {
      const includes = Array.isArray(body.photo_includes) ? body.photo_includes : [];
      const byUrl = new Map<string, boolean>();
      for (const row of includes) {
        if (!row || typeof row !== "object") continue;
        const r = row as { public_url?: unknown; include?: unknown };
        if (typeof r.public_url !== "string" || !r.public_url.trim()) continue;
        byUrl.set(r.public_url.trim(), r.include !== false);
      }
      const { data: item, error } = await supabase
        .from("portal_review_items")
        .select("payload, status, type")
        .eq("id", id)
        .maybeSingle();
      if (error || !item) throw new Error("Review item not found");
      if ((item.status as string) !== "pending") throw new Error("Item already reviewed");
      if (
        item.type !== FREE_ONBOARD_TYPES.newListing &&
        item.type !== FREE_ONBOARD_TYPES.update
      ) {
        throw new Error("Photo includes only apply to free intake");
      }
      const payload = { ...((item.payload as Record<string, unknown>) ?? {}) };
      const photos = Array.isArray(payload.photos) ? [...payload.photos] : [];
      payload.photos = photos.map((p) => {
        if (!p || typeof p !== "object") return p;
        const photo = p as Record<string, unknown>;
        const url = typeof photo.public_url === "string" ? photo.public_url : "";
        if (!url || !byUrl.has(url)) return photo;
        return { ...photo, include: byUrl.get(url) };
      });
      const { error: updErr } = await supabase
        .from("portal_review_items")
        .update({ payload })
        .eq("id", id);
      if (updErr) throw new Error(updErr.message);
      return NextResponse.json({ ok: true });
    }
    if (action === "create_location") {
      if (!locationId) {
        return NextResponse.json({ error: "location_id required" }, { status: 400 });
      }
      await applySuggestionsIfRequested();
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
      await applySuggestionsIfRequested();
      const result = await approveAllFreeLocations(supabase, id, admin.userId);
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === "approve") {
      const { data: pendingItem } = await supabase
        .from("portal_review_items")
        .select("type")
        .eq("id", id)
        .maybeSingle();
      if (
        pendingItem?.type === "photo" &&
        !isBusinessPhotosFeatureEnabled(await getAllFeatureFlags())
      ) {
        return NextResponse.json(
          { error: "Business photos are disabled. Enable the business_photos flag to approve." },
          { status: 403 },
        );
      }
      await applySuggestionsIfRequested();
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
        item?.type === FREE_ONBOARD_TYPES.update ||
        item?.type === FREE_ONBOARD_TYPES.removal
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
          "action must be approve, reject, needs_changes, create_location, skip_location, approve_all_locations, or set_photo_includes",
      },
      { status: 400 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Review action failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
