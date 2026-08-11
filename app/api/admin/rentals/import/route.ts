import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPostHogServerClient } from "@/lib/analytics/posthog-server";
import { rentalsApiBlocked } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { importRentalCsv, previewRentalCsv } from "@/lib/stays/import-csv";
import { getServiceSupabase } from "@/lib/supabase/service-role";

const bodySchema = z.object({
  partner_id: z.string().uuid(),
  csv_text: z.string().min(10).max(5_000_000),
  preview_only: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const blocked = await rentalsApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid import payload" }, { status: 400 });
  }

  if (parsed.data.preview_only) {
    const preview = await previewRentalCsv(parsed.data.csv_text);
    return NextResponse.json(preview);
  }

  const supabase = getServiceSupabase();
  const { data: partner } = await supabase
    .from("rental_partner_profiles")
    .select("id, business_id, status")
    .eq("id", parsed.data.partner_id)
    .maybeSingle();
  if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

  const ph = getPostHogServerClient();
  ph?.capture({
    distinctId: admin.userId,
    event: "rental_import_started",
    properties: {
      partner_id: parsed.data.partner_id,
      method: "csv",
    },
  });

  try {
    const result = await importRentalCsv({
      partnerId: parsed.data.partner_id,
      businessId: (partner as { business_id: string }).business_id,
      csvText: parsed.data.csv_text,
      createdBy: admin.userId,
    });

    ph?.capture({
      distinctId: admin.userId,
      event: result.status === "failed" ? "rental_import_failed" : "rental_import_completed",
      properties: {
        partner_id: parsed.data.partner_id,
        job_id: result.jobId,
        rows_ok: result.rowsOk,
        rows_failed: result.rowsFailed,
      },
    });
    await ph?.shutdown();

    return NextResponse.json(result);
  } catch (e) {
    ph?.capture({
      distinctId: admin.userId,
      event: "rental_import_failed",
      properties: {
        partner_id: parsed.data.partner_id,
        error_code: e instanceof Error ? e.message : "unknown",
      },
    });
    await ph?.shutdown();
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 },
    );
  }
}
