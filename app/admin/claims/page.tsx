import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { resolveClaimFormAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminClaimsPage() {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const { data: rows } = await supabase
    .from("business_claim_requests")
    .select(
      "id, business_id, user_id, status, claimant_note, created_at, businesses(name, slug)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Listing claims</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Pending requests only. Approve sets business to <code>claimed</code> and rejects other
          pendings for that listing.
        </p>
      </div>
      <ul className="space-y-4">
        {(rows ?? []).length ? (
          (rows ?? []).map((r) => {
            const b = r.businesses as { name?: string; slug?: string } | null;
            const rid = r.id as number;
            return (
              <li
                key={rid}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <p className="font-medium text-zinc-900">{b?.name ?? r.business_id}</p>
                {b?.slug ? (
                  <p className="text-xs text-teal-700">
                    /business/{b.slug}
                  </p>
                ) : null}
                <p className="text-xs text-zinc-500">
                  Request #{rid} · user {r.user_id as string} ·{" "}
                  {new Date(r.created_at as string).toLocaleString()}
                </p>
                {r.claimant_note ? (
                  <p className="mt-2 text-sm text-zinc-700">{r.claimant_note as string}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={resolveClaimFormAction}>
                    <input type="hidden" name="request_id" value={rid} />
                    <input type="hidden" name="decision" value="approved" />
                    <input type="hidden" name="admin_note" value="" />
                    <button
                      type="submit"
                      className="rounded-lg bg-teal-800 px-3 py-1.5 text-sm text-white hover:bg-teal-900"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={resolveClaimFormAction}>
                    <input type="hidden" name="request_id" value={rid} />
                    <input type="hidden" name="decision" value="rejected" />
                    <input type="hidden" name="admin_note" value="" />
                    <button
                      type="submit"
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </li>
            );
          })
        ) : (
          <li className="text-sm text-zinc-500">No pending claims.</li>
        )}
      </ul>
    </div>
  );
}
