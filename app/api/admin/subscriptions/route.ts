import { NextResponse } from "next/server";
import { onboardApiBlocked } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET() {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("business_subscriptions")
    .select(
      `
      business_id, plan_slug, status, stripe_customer_id, stripe_subscription_id,
      current_period_end, comped_by, updated_at,
      businesses ( title, slug )
    `,
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
