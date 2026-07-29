import Link from "next/link";
import { redirect } from "next/navigation";
import { OperatorToolsLinks } from "@/components/admin/OperatorToolsLinks";
import { adminNavItemsForSession } from "@/lib/admin/admin-nav";
import { getAllFeatureFlags, isCommunityTipsFeatureEnabled, isFreeOnboardEnabled, isOnboardEnabled, isSearchInspectorEnabled } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminHomePage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const flags = await getAllFeatureFlags();
  const items = adminNavItemsForSession({
    onboardEnabled: isOnboardEnabled(flags),
    freeOnboardEnabled: isFreeOnboardEnabled(flags),
    searchInspectorEnabled: isSearchInspectorEnabled(flags),
    communityTipsEnabled: isCommunityTipsFeatureEnabled(flags),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-headline text-2xl font-bold tracking-tight text-zinc-900">Admin</h1>
      <p className="mt-2 text-sm text-zinc-600">Operator tools for WhereTo30A.</p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Tools</h2>
        {items.length > 0 ? (
          <OperatorToolsLinks items={items} />
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            No operator tools are enabled for this environment. Turn on the{" "}
            <code className="rounded bg-zinc-100 px-1">community_tips</code>,{" "}
            <code className="rounded bg-zinc-100 px-1">free_onboard</code>,{" "}
            <code className="rounded bg-zinc-100 px-1">onboard</code>, or{" "}
            <code className="rounded bg-zinc-100 px-1">search_inspector</code> PostHog flags.
          </p>
        )}
      </section>

      <p className="mt-8 text-sm text-zinc-500">
        <Link href="/profile" className="font-medium text-zinc-700 underline hover:text-zinc-900">
          Back to profile
        </Link>
      </p>
    </div>
  );
}
