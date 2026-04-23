import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50/50 p-6 sm:p-8">
              <h1 className="text-2xl font-bold text-zinc-900">Your Profile</h1>
              <p className="mt-1 text-sm text-zinc-500">Manage your account and preferences.</p>
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
                </div>
              </section>

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
