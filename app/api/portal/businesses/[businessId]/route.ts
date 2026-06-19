import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { onboardApiBlocked } from "@/lib/feature-flags";
import {
  filterChangesForEntitlements,
  getBusinessPlan,
  OWNER_EDITABLE_FIELDS,
} from "@/lib/portal/entitlements";
import { sendPortalOwnerEmail } from "@/lib/portal/notifications";
import { requireBusinessMember } from "@/lib/portal/require-business-member";
import { getServiceSupabase } from "@/lib/supabase/service-role";

const optionalUrl = z
  .string()
  .max(500)
  .optional()
  .transform((s) => (s ?? "").trim())
  .refine((s) => s === "" || /^https?:\/\/.+/i.test(s), "Use a full URL starting with http:// or https://");

const socialLinksSchema = z
  .object({
    instagram: z.string().max(200).optional(),
    facebook: z.string().max(200).optional(),
  })
  .optional();

const patchSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  phone: z.string().max(40).optional().transform((s) => (s ?? "").trim() || null),
  email: z.string().max(320).optional().transform((s) => (s ?? "").trim() || null),
  website: optionalUrl.transform((s) => (s === "" ? null : s)).optional(),
  address: z.string().max(500).optional().transform((s) => (s ?? "").trim() || null),
  excerpt: z.string().max(500).optional().transform((s) => (s ?? "").trim() || null),
  content: z.string().max(8000).optional().transform((s) => (s ?? "").trim() || null),
  service_area: z.string().max(500).optional().transform((s) => (s ?? "").trim() || null),
  hours: z.unknown().optional(),
  social_links: socialLinksSchema,
});

type RouteContext = { params: Promise<{ businessId: string }> };

const BUSINESS_SELECT =
  "id, title, slug, phone, email, website, address, excerpt, content, hours, social_links, service_area";

function normalizeForCompare(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim();
}

function buildChanges(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const key of OWNER_EDITABLE_FIELDS) {
    if (!(key in incoming)) continue;
    const next = incoming[key];
    const prev = current[key];
    if (normalizeForCompare(next) !== normalizeForCompare(prev)) {
      changes[key] = next;
    }
  }
  return changes;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const { businessId } = await context.params;
  const member = await requireBusinessMember(businessId);
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getServiceSupabase();
  const { data: business, error } = await supabase
    .from("businesses")
    .select(BUSINESS_SELECT)
    .eq("id", businessId)
    .maybeSingle();

  if (error || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const { planSlug, entitlements } = await getBusinessPlan(supabase, businessId);

  const { data: pendingEdit } = await supabase
    .from("business_edit_proposals")
    .select("id, changes, created_at")
    .eq("business_id", businessId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: photoCount } = await supabase
    .from("business_photos")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .in("status", ["pending", "approved"]);

  return NextResponse.json({
    business,
    plan: planSlug,
    entitlements,
    pending_edit: pendingEdit ?? null,
    photo_count: photoCount ?? 0,
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const { businessId } = await context.params;
  const member = await requireBusinessMember(businessId);
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the form and try again.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabase();

  const { data: existingPending } = await supabase
    .from("business_edit_proposals")
    .select("id")
    .eq("business_id", businessId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (existingPending) {
    return NextResponse.json(
      { error: "You already have edits under review. Wait for approval before submitting more." },
      { status: 409 },
    );
  }

  const { data: current } = await supabase
    .from("businesses")
    .select(BUSINESS_SELECT)
    .eq("id", businessId)
    .maybeSingle();
  if (!current) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { entitlements } = await getBusinessPlan(supabase, businessId);
  const rawChanges = buildChanges(current as Record<string, unknown>, parsed.data);
  const changes = filterChangesForEntitlements(rawChanges, entitlements);

  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: "No changes to submit." }, { status: 400 });
  }

  const { data: proposal, error: proposalErr } = await supabase
    .from("business_edit_proposals")
    .insert({
      business_id: businessId,
      submitted_by: member.userId,
      changes,
      status: "pending",
    })
    .select("id")
    .single();

  if (proposalErr || !proposal) {
    return NextResponse.json({ error: proposalErr?.message ?? "Could not save proposal" }, { status: 500 });
  }

  const businessTitle = String((current as { title?: string }).title ?? "your business");

  const { data: reviewItem, error: reviewErr } = await supabase
    .from("portal_review_items")
    .insert({
      type: "edit",
      status: "pending",
      business_id: businessId,
      submitted_by: member.userId,
      payload: {
        proposal_id: proposal.id,
        business_title: businessTitle,
        changes,
      },
    })
    .select("id")
    .single();

  if (reviewErr || !reviewItem) {
    return NextResponse.json({ error: reviewErr?.message ?? "Could not queue review" }, { status: 500 });
  }

  await supabase
    .from("business_edit_proposals")
    .update({ review_item_id: reviewItem.id })
    .eq("id", proposal.id);

  const { data: user } = await supabase.auth.admin.getUserById(member.userId);
  if (user.user?.email) {
    await sendPortalOwnerEmail({
      to: user.user.email,
      event: "edit_submitted",
      businessTitle,
    });
  }

  return NextResponse.json({ ok: true, review_item_id: reviewItem.id });
}
