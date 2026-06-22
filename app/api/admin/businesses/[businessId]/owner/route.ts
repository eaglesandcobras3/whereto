import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { onboardApiBlocked } from "@/lib/feature-flags";
import { transferBusinessOwner } from "@/lib/portal/transfer-owner";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

const bodySchema = z.object({
  email: z.string().trim().email().max(320),
});

type RouteContext = { params: Promise<{ businessId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { businessId } = await context.params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  try {
    await transferBusinessOwner(supabase, businessId, parsed.data.email);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Transfer failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
