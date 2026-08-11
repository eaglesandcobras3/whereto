import { NextRequest, NextResponse } from "next/server";
import { rentalsApiBlocked } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { markStaleRentalInventory, syncPropertyIcal } from "@/lib/stays/sync-availability";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { z } from "zod";

const syncSchema = z.object({
  property_id: z.string().uuid(),
  ical_text: z.string().min(20).max(2_000_000),
  source_id: z.string().uuid().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const blocked = await rentalsApiBlocked();
  if (blocked) return blocked;
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = syncSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sync payload" }, { status: 400 });
  }

  const result = await syncPropertyIcal({
    propertyId: parsed.data.property_id,
    icalText: parsed.data.ical_text,
    sourceId: parsed.data.source_id,
  });

  const supabase = getServiceSupabase();
  const { data: prop } = await supabase
    .from("rental_properties")
    .select("partner_id")
    .eq("id", parsed.data.property_id)
    .maybeSingle();
  if (prop?.partner_id) {
    await supabase
      .from("rental_partner_profiles")
      .update({ last_availability_sync_at: new Date().toISOString() })
      .eq("id", prop.partner_id);
  }

  return NextResponse.json({ ok: true, ...result });
}

export async function PUT() {
  const blocked = await rentalsApiBlocked();
  if (blocked) return blocked;
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await markStaleRentalInventory();
  return NextResponse.json({ ok: true, ...result });
}
