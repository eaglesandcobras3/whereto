import { NextRequest, NextResponse } from "next/server";
import { onboardApiBlocked } from "@/lib/feature-flags";
import { approveReviewItem, needsChangesReviewItem, rejectReviewItem } from "@/lib/portal/review-queue";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  let body: { action?: string; admin_notes?: string };
  try {
    body = (await request.json()) as { action?: string; admin_notes?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "").trim();
  const adminNotes = String(body.admin_notes ?? "").trim().slice(0, 2000) || null;

  const supabase = getServiceSupabase();

  try {
    if (action === "approve") {
      await approveReviewItem(supabase, id, admin.userId);
      return NextResponse.json({ ok: true, status: "approved" });
    }
    if (action === "reject") {
      await rejectReviewItem(supabase, id, admin.userId, adminNotes);
      return NextResponse.json({ ok: true, status: "rejected" });
    }
    if (action === "needs_changes") {
      if (!adminNotes) {
        return NextResponse.json({ error: "Add a note explaining what to change." }, { status: 400 });
      }
      await needsChangesReviewItem(supabase, id, admin.userId, adminNotes);
      return NextResponse.json({ ok: true, status: "needs_changes" });
    }
    return NextResponse.json({ error: "action must be approve, reject, or needs_changes" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Review action failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
