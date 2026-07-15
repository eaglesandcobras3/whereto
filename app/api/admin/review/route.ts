import { NextRequest, NextResponse } from "next/server";
import { reviewApiBlocked } from "@/lib/feature-flags";
import {
  FREE_ONBOARD_SEARCH_TAGS_MAX,
  FREE_ONBOARD_TYPES,
  freeOnboardBodySchema,
  type FreeOnboardLocationPayload,
  type FreeOnboardPayload,
} from "@/lib/listing-requests/free-onboard-schema";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET() {
  const blocked = await reviewApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("portal_review_items")
    .select(
      `
      id, type, status, business_id, submitted_by, payload, admin_notes, created_at,
      businesses ( title, slug )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

/** Manual enqueue for free intake (admin). */
export async function POST(request: NextRequest) {
  const blocked = await reviewApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = freeOnboardBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the form and try again.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const targetBusinessId = d.target_business_id ?? null;
  const isUpdate = Boolean(targetBusinessId);
  const locations: FreeOnboardLocationPayload[] = d.locations.map((l, i) => ({
    id: `loc-admin-${i + 1}-${crypto.randomUUID().slice(0, 6)}`,
    town_id: l.town_id,
    address: l.address,
    status: "pending",
  }));

  const payload: FreeOnboardPayload = {
    source: "free_onboard",
    submitter_name: d.submitter_name,
    submitter_email: d.submitter_email,
    title: d.title,
    is_storefront: d.is_storefront,
    is_service_business: d.is_service_business,
    website: d.website,
    phone: d.phone,
    excerpt: d.excerpt,
    overview: d.overview,
    category_id: d.category_id,
    search_tags: d.search_tags.slice(0, FREE_ONBOARD_SEARCH_TAGS_MAX),
    suggested_tags: d.suggested_tags.slice(
      0,
      Math.max(0, FREE_ONBOARD_SEARCH_TAGS_MAX - Math.min(d.search_tags.length, FREE_ONBOARD_SEARCH_TAGS_MAX)),
    ),
    search_keywords: d.search_keywords,
    marketing_opt_in: d.marketing_opt_in,
    target_business_id: targetBusinessId,
    locations,
  };

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("portal_review_items")
    .insert({
      type: isUpdate ? FREE_ONBOARD_TYPES.update : FREE_ONBOARD_TYPES.newListing,
      status: "pending",
      submitted_by: admin.userId,
      business_id: targetBusinessId,
      payload,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not create queue item" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
