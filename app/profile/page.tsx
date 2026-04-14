import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Use Service Role to bypass RLS recursion on the profiles table
  const serviceSupabase = getServiceSupabase();
  const { data: profile, error: profileError } = await serviceSupabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Profile fetch error:", profileError);
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
            
            <div className="p-6 sm:p-8 space-y-8">
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
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              </section>

              {profile?.is_admin && (
                <section className="rounded-xl border border-teal-100 bg-teal-50/50 p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="font-semibold text-teal-900">Admin Privileges</h2>
                      <p className="text-sm text-teal-700">You have access to the site administration tools.</p>
                      <Link 
                        href="/admin" 
                        className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-teal-800 hover:text-teal-900 underline decoration-2 underline-offset-4"
                      >
                        Go to Admin Dashboard →
                      </Link>
                    </div>
                  </div>
                </section>
              )}

              <section className="pt-4 border-t border-zinc-100">
                <form action="/api/auth/signout" method="post">
                  <button 
                    type="submit"
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-100 transition-colors"
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
