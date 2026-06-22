import type { SupabaseClient } from "@supabase/supabase-js";

export async function transferBusinessOwner(
  supabase: SupabaseClient,
  businessId: string,
  newOwnerEmail: string,
): Promise<void> {
  const email = newOwnerEmail.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("Enter a valid email address.");

  const { data: biz } = await supabase.from("businesses").select("id, title").eq("id", businessId).maybeSingle();
  if (!biz) throw new Error("Business not found");

  const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw new Error(listErr.message);

  const newOwner = (listData?.users ?? []).find((u) => u.email?.toLowerCase() === email);
  if (!newOwner) throw new Error("No account found with that email. They must sign up first.");

  const { data: currentOwners } = await supabase
    .from("business_members")
    .select("user_id, role")
    .eq("business_id", businessId)
    .eq("role", "owner");

  for (const row of currentOwners ?? []) {
    if (row.user_id === newOwner.id) continue;
    await supabase
      .from("business_members")
      .update({ role: "manager" })
      .eq("business_id", businessId)
      .eq("user_id", row.user_id as string);
  }

  const { data: existingMember } = await supabase
    .from("business_members")
    .select("id, role")
    .eq("business_id", businessId)
    .eq("user_id", newOwner.id)
    .maybeSingle();

  if (existingMember) {
    await supabase
      .from("business_members")
      .update({ role: "owner" })
      .eq("business_id", businessId)
      .eq("user_id", newOwner.id);
  } else {
    await supabase.from("business_members").insert({
      business_id: businessId,
      user_id: newOwner.id,
      role: "owner",
    });
  }

  await supabase
    .from("businesses")
    .update({
      claim_status: "claimed",
      claimed_by_user_id: newOwner.id,
    })
    .eq("id", businessId);
}
