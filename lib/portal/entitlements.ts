import type { SupabaseClient } from "@supabase/supabase-js";
import { effectivePlanSlug, type BusinessSubscriptionRow } from "@/lib/portal/billing";

export type PlanSlug =
  | "claimed_listing"
  | "local_partner"
  | "premium_partner"
  | "signature_partner";

export const PAID_PLAN_SLUGS = [
  "local_partner",
  "premium_partner",
  "signature_partner",
] as const satisfies readonly PlanSlug[];

export type PaidPlanSlug = (typeof PAID_PLAN_SLUGS)[number];

export function isPaidPlan(slug: string): slug is PaidPlanSlug {
  return (PAID_PLAN_SLUGS as readonly string[]).includes(slug);
}

export type PlanEntitlements = {
  max_photos: number;
  hours: boolean;
  social_links: boolean;
  long_description: boolean;
  /** Future hook — not enforced in UI yet */
  featured_placement?: boolean;
  /** Future hook — not enforced in UI yet */
  analytics?: boolean;
  /** Future hook — not enforced in UI yet */
  priority_support?: boolean;
};

const DEFAULT_ENTITLEMENTS: Record<PlanSlug, PlanEntitlements> = {
  claimed_listing: {
    max_photos: 2,
    hours: false,
    social_links: false,
    long_description: false,
  },
  local_partner: {
    max_photos: 12,
    hours: true,
    social_links: true,
    long_description: true,
  },
  premium_partner: {
    max_photos: 24,
    hours: true,
    social_links: true,
    long_description: true,
    featured_placement: true,
    analytics: false,
  },
  signature_partner: {
    max_photos: 48,
    hours: true,
    social_links: true,
    long_description: true,
    featured_placement: true,
    analytics: true,
    priority_support: true,
  },
};

export function planDisplayName(slug: PlanSlug | string): string {
  switch (slug) {
    case "local_partner":
      return "Local Partner";
    case "premium_partner":
      return "Premium Partner";
    case "signature_partner":
      return "Signature Partner";
    case "claimed_listing":
      return "Claimed listing (free)";
    default:
      return slug;
  }
}

export function parseEntitlements(raw: unknown, planSlug: PlanSlug): PlanEntitlements {
  const fallback = DEFAULT_ENTITLEMENTS[planSlug];
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  return {
    max_photos: typeof o.max_photos === "number" ? o.max_photos : fallback.max_photos,
    hours: typeof o.hours === "boolean" ? o.hours : fallback.hours,
    social_links: typeof o.social_links === "boolean" ? o.social_links : fallback.social_links,
    long_description:
      typeof o.long_description === "boolean" ? o.long_description : fallback.long_description,
    featured_placement:
      typeof o.featured_placement === "boolean" ? o.featured_placement : fallback.featured_placement,
    analytics: typeof o.analytics === "boolean" ? o.analytics : fallback.analytics,
    priority_support:
      typeof o.priority_support === "boolean" ? o.priority_support : fallback.priority_support,
  };
}

export async function getBusinessPlan(
  supabase: SupabaseClient,
  businessId: string,
): Promise<{ planSlug: PlanSlug; entitlements: PlanEntitlements }> {
  const { data: sub } = await supabase
    .from("business_subscriptions")
    .select("plan_slug, status, subscription_plans ( entitlements )")
    .eq("business_id", businessId)
    .maybeSingle();

  const planSlug: PlanSlug = effectivePlanSlug(
    sub
      ? {
          plan_slug: sub.plan_slug as PlanSlug,
          status: sub.status as BusinessSubscriptionRow["status"],
        }
      : null,
  );

  const planRow = sub?.subscription_plans as { entitlements?: unknown } | null;
  const entitlements = parseEntitlements(planRow?.entitlements, planSlug);
  return { planSlug, entitlements };
}

export async function ensureBusinessSubscription(
  supabase: SupabaseClient,
  businessId: string,
): Promise<void> {
  await supabase
    .from("business_subscriptions")
    .upsert(
      {
        business_id: businessId,
        plan_slug: "claimed_listing",
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id", ignoreDuplicates: true },
    );
}

/** Owner-editable fields allowed in edit proposals (values still gated by entitlements). */
export const OWNER_EDITABLE_FIELDS = [
  "title",
  "phone",
  "email",
  "website",
  "address",
  "excerpt",
  "content",
  "hours",
  "social_links",
  "service_area",
] as const;

export type OwnerEditableField = (typeof OWNER_EDITABLE_FIELDS)[number];

export function filterChangesForEntitlements(
  changes: Record<string, unknown>,
  entitlements: PlanEntitlements,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(changes)) {
    if (!OWNER_EDITABLE_FIELDS.includes(key as OwnerEditableField)) continue;
    if (key === "hours" && !entitlements.hours) continue;
    if (key === "social_links" && !entitlements.social_links) continue;
    if (key === "content" && !entitlements.long_description) {
      if (typeof value === "string") out.excerpt = value.slice(0, 500);
      continue;
    }
    out[key] = value;
  }
  return out;
}
