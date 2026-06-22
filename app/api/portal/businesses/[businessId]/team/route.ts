import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { onboardApiBlocked } from "@/lib/feature-flags";
import {
  createManagerInvite,
  listTeam,
  removeManager,
  revokeInvite,
} from "@/lib/portal/invites";
import { requireBusinessMember } from "@/lib/portal/require-business-member";
import { requireBusinessOwner } from "@/lib/portal/require-business-owner";
import { requirePortalUser } from "@/lib/portal/require-portal-user";
import { getServiceSupabase } from "@/lib/supabase/service-role";

const inviteSchema = z.object({
  email: z.string().trim().email().max(320),
});

type RouteContext = { params: Promise<{ businessId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const { businessId } = await context.params;
  const member = await requireBusinessMember(businessId);
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getServiceSupabase();
  const team = await listTeam(supabase, businessId);

  return NextResponse.json({
    ...team,
    can_manage: member.role === "owner",
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const { businessId } = await context.params;
  const owner = await requireBusinessOwner(businessId);
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const session = await requirePortalUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = inviteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: biz } = await supabase
    .from("businesses")
    .select("title")
    .eq("id", businessId)
    .maybeSingle();
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  try {
    const invite = await createManagerInvite({
      supabase,
      businessId,
      businessTitle: String(biz.title),
      invitedByUserId: owner.userId,
      inviterEmail: session.user.email ?? null,
      email: parsed.data.email,
    });
    return NextResponse.json({ ok: true, invite: { id: invite.id, email: invite.email } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not send invite";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const { businessId } = await context.params;
  const owner = await requireBusinessOwner(businessId);
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const inviteId = request.nextUrl.searchParams.get("invite_id")?.trim();
  const userId = request.nextUrl.searchParams.get("user_id")?.trim();
  const supabase = getServiceSupabase();

  try {
    if (inviteId) {
      await revokeInvite(supabase, businessId, inviteId);
      return NextResponse.json({ ok: true });
    }
    if (userId) {
      await removeManager(supabase, businessId, userId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "invite_id or user_id required" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Action failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
