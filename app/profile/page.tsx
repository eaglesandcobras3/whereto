import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileBusinessPortalSection } from "@/components/profile/ProfileBusinessPortalSection";
import { getAllFeatureFlags, isOnboardEnabled } from "@/lib/feature-flags";
import { loadPortalAccountSummary } from "@/lib/portal/load-portal-account-summary";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const flags = await getAllFeatureFlags();
  const onboardEnabled = isOnboardEnabled(flags);
  const portalSummary = onboardEnabled ? await loadPortalAccountSummary(user.id) : null;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50/50 p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-zinc-900">Your account</h1>
                  <p className="mt-1 text-sm text-zinc-500">
                    {portalSummary
                      ? "You browse as a visitor and manage business listings when needed."
                      : "Sign-in for saving spots and site features. Browse towns and guides like any visitor."}
                  </p>
                </div>
                {portalSummary ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    <span className="material-symbols-outlined text-base" aria-hidden>
                      verified
                    </span>
                    Business account
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-8 p-6 sm:p-8">
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Account Information</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                    <p className="text-xs font-medium text-zinc-500">Email Address</p>
                    <p className="mt-1 font-medium text-zinc-900">{user.email}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                    <p className="text-xs font-medium text-zinc-500">Member Since</p>
                    <p className="mt-1 font-medium text-zinc-900">
                      {new Date(user.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                    <p className="text-xs font-medium text-zinc-500">Account type</p>
                    <p className="mt-1 font-medium text-zinc-900">
                      {portalSummary ? "Visitor + business owner" : "Visitor"}
                    </p>
                  </div>
                </div>
              </section>

              {portalSummary?.hasPortalActivity ? (
                <ProfileBusinessPortalSection summary={portalSummary} />
              ) : null}

              <section className="border-t border-zinc-100 pt-4">
                <form action="/api/auth/signout" method="post">
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:border-red-100 hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </form>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
