import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rentalsApiBlocked } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { setPartnerStatus } from "@/lib/stays/partner-application";
import {
  RENTAL_PARTNER_STATUSES,
  RENTAL_PROPERTY_STATUSES,
  RENTAL_PROPERTY_TYPES,
} from "@/lib/stays/types";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET(request: NextRequest) {
  const blocked = await rentalsApiBlocked();
  if (blocked) return blocked;
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const kind = request.nextUrl.searchParams.get("kind") ?? "properties";
  const supabase = getServiceSupabase();

  if (kind === "partners") {
    const { data, error } = await supabase
      .from("rental_partner_profiles")
      .select(
        "id, business_id, display_name, show_public_business_profile, status, contact_name, contact_email, pms_name, import_method, created_at, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  }

  if (kind === "jobs") {
    const { data, error } = await supabase
      .from("rental_import_jobs")
      .select("id, partner_id, method, status, stats, created_at, finished_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  }

  const status = request.nextUrl.searchParams.get("status");
  let q = supabase
    .from("rental_properties")
    .select(
      "id, slug, title, status, business_id, partner_id, town_id, bedrooms, bathrooms, sleeps, booking_url, content_rights_confirmed, last_synced_at, last_sync_status, featured, date_updated",
    )
    .order("date_updated", { ascending: false })
    .limit(100);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid().optional().nullable(),
  partner_id: z.string().uuid(),
  slug: z.string().trim().min(2).max(160),
  title: z.string().trim().min(2).max(200),
  description: z.string().max(20000).optional().nullable(),
  local_context: z.string().max(20000).optional().nullable(),
  property_type: z.enum(RENTAL_PROPERTY_TYPES).default("house"),
  status: z.enum(RENTAL_PROPERTY_STATUSES).default("draft"),
  town_id: z.string().uuid().optional().nullable(),
  area_id: z.string().uuid().optional().nullable(),
  bedrooms: z.coerce.number().min(0).max(30),
  bathrooms: z.coerce.number().min(0).max(30),
  sleeps: z.coerce.number().int().min(1).max(50),
  pets_allowed: z.boolean().optional().nullable(),
  private_pool: z.boolean().optional().nullable(),
  gulf_front: z.boolean().optional().nullable(),
  gulf_view: z.boolean().optional().nullable(),
  beach_access: z.enum(["none", "public", "private", "unknown"]).optional().nullable(),
  golf_cart_included: z.boolean().optional().nullable(),
  booking_url: z.string().url().optional().nullable(),
  hero_image_url: z.string().url().optional().nullable(),
  content_rights_confirmed: z.boolean().optional(),
  featured: z.boolean().optional(),
  pricing_reliable: z.boolean().optional(),
  starting_nightly_rate: z.coerce.number().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const blocked = await rentalsApiBlocked();
  if (blocked) return blocked;
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = upsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const row = {
    ...parsed.data,
    date_updated: new Date().toISOString(),
    published_at:
      parsed.data.status === "published" ? new Date().toISOString() : undefined,
  };

  if (parsed.data.id) {
    const { error } = await supabase.from("rental_properties").update(row).eq("id", parsed.data.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: parsed.data.id });
  }

  const { data, error } = await supabase.from("rental_properties").insert(row).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

const partnerActionSchema = z.object({
  partner_id: z.string().uuid(),
  status: z.enum(RENTAL_PARTNER_STATUSES),
  admin_notes: z.string().max(2000).optional().nullable(),
  rejected_reason: z.string().max(2000).optional().nullable(),
});

export async function PATCH(request: NextRequest) {
  const blocked = await rentalsApiBlocked();
  if (blocked) return blocked;
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = partnerActionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid partner update" }, { status: 400 });
  }

  await setPartnerStatus({
    partnerId: parsed.data.partner_id,
    status: parsed.data.status,
    adminNotes: parsed.data.admin_notes,
    rejectedReason: parsed.data.rejected_reason,
    approvedBy: admin.userId,
  });

  return NextResponse.json({ ok: true });
}
