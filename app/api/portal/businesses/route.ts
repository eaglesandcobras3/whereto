import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { onboardApiBlocked } from "@/lib/feature-flags";
import { getBusinessPlan } from "@/lib/portal/entitlements";
import { sendPortalOwnerEmail } from "@/lib/portal/notifications";
import { requirePortalUser } from "@/lib/portal/require-portal-user";
import { getServiceSupabase } from "@/lib/supabase/service-role";

const optionalUrl = z
  .string()
  .max(500)
  .optional()
  .transform((s) => (s ?? "").trim())
  .refine((s) => s === "" || /^https?:\/\/.+/i.test(s), "Use a full URL starting with http:// or https://");

const bodySchema = z.object({
  title: z.string().trim().min(2).max(200),
  town_id: z.string().uuid(),
  address: z.string().max(500).optional().transform((s) => (s ?? "").trim() || null),
  website: optionalUrl.transform((s) => (s === "" ? null : s)),
  phone: z.string().max(40).optional().transform((s) => (s ?? "").trim() || null),
  email: z
    .string()
    .max(320)
    .optional()
    .transform((s) => (s ?? "").trim() || null),
  description: z.string().trim().min(15).max(4000),
  is_storefront: z.boolean().optional().default(false),
  is_service_business: z.boolean().optional().default(false),
  service_area: z.string().max(500).optional().transform((s) => (s ?? "").trim() || null),
  map_lat: z.union([z.number(), z.null()]).optional(),
  map_lng: z.union([z.number(), z.null()]).optional(),
});

export async function GET() {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const session = await requirePortalUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServiceSupabase();

  const { data: memberships, error: memErr } = await supabase
    .from("business_members")
    .select("role, business_id, businesses ( id, title, slug, claim_status )")
    .eq("user_id", session.user.id);

  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 500 });
  }

  const businesses = await Promise.all(
    (memberships ?? []).map(async (m) => {
      const bizRaw = m.businesses;
      const biz = (Array.isArray(bizRaw) ? bizRaw[0] : bizRaw) as Record<string, unknown> | null;
      const id = biz?.id as string;
      const { planSlug } = id ? await getBusinessPlan(supabase, id) : { planSlug: "claimed_listing" as const };
      return {
        id,
        title: biz?.title as string,
        slug: biz?.slug as string,
        role: m.role as string,
        claim_status: biz?.claim_status as string,
        plan: planSlug,
      };
    }),
  );

  const { data: pending } = await supabase
    .from("portal_review_items")
    .select("id, type, status, business_id, payload, created_at")
    .eq("submitted_by", session.user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return NextResponse.json({ businesses, pending: pending ?? [] });
}

export async function POST(request: NextRequest) {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const session = await requirePortalUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the form and try again.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const d = parsed.data;
  if (!d.is_storefront && !d.is_service_business) {
    return NextResponse.json(
      { error: "Select whether you have a storefront, offer on-site/mobile service, or both." },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabase();
  const user = session.user;
  const submitterName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Business owner";

  const { data: listing, error: listingErr } = await supabase
    .from("business_listing_requests")
    .insert({
      submitter_name: submitterName,
      submitter_email: user.email ?? "",
      title: d.title,
      town_id: d.town_id,
      address: d.address,
      website: d.website,
      phone: d.phone,
      email: d.email,
      description: d.description,
      is_storefront: d.is_storefront,
      is_service_business: d.is_service_business,
      service_area: d.service_area,
      map_lat: d.map_lat ?? null,
      map_lng: d.map_lng ?? null,
      user_id: user.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (listingErr || !listing) {
    return NextResponse.json({ error: listingErr?.message ?? "Could not save request" }, { status: 500 });
  }

  const { data: reviewItem, error: reviewErr } = await supabase
    .from("portal_review_items")
    .insert({
      type: "new_listing",
      status: "pending",
      submitted_by: user.id,
      payload: {
        listing_request_id: listing.id,
        title: d.title,
        submitter_email: user.email,
      },
    })
    .select("id")
    .single();

  if (reviewErr || !reviewItem) {
    return NextResponse.json({ error: reviewErr?.message ?? "Could not queue review" }, { status: 500 });
  }

  await supabase
    .from("business_listing_requests")
    .update({ review_item_id: reviewItem.id })
    .eq("id", listing.id);

  if (user.email) {
    await sendPortalOwnerEmail({
      to: user.email,
      event: "listing_submitted",
      businessTitle: d.title,
    });
  }

  return NextResponse.json({ ok: true, review_item_id: reviewItem.id });
}
