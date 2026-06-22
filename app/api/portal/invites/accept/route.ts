import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { onboardApiBlocked } from "@/lib/feature-flags";
import { acceptInvite } from "@/lib/portal/invites";
import { requirePortalUser } from "@/lib/portal/require-portal-user";
import { getServiceSupabase } from "@/lib/supabase/service-role";

const bodySchema = z.object({
  token: z.string().trim().min(10).max(200),
});

export async function POST(request: NextRequest) {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const session = await requirePortalUser();
  if (!session?.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite token." }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  try {
    const result = await acceptInvite({
      supabase,
      token: parsed.data.token,
      userId: session.user.id,
      userEmail: session.user.email,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not accept invite";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
