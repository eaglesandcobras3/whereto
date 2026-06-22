import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { siteBaseUrl } from "@/lib/stripe/server";
import { sendPortalInviteEmail } from "@/lib/portal/notifications";

const INVITE_TTL_DAYS = 7;

export type MemberInviteRow = {
  id: string;
  business_id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function inviteToken(): string {
  return randomBytes(24).toString("base64url");
}

function acceptUrl(token: string): string {
  return `${siteBaseUrl()}/portal/invites/accept?token=${encodeURIComponent(token)}`;
}

export async function listTeam(
  supabase: SupabaseClient,
  businessId: string,
): Promise<{
  members: { user_id: string; role: string; email: string | null }[];
  invites: MemberInviteRow[];
}> {
  const { data: members } = await supabase
    .from("business_members")
    .select("user_id, role")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  const memberRows = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data: user } = await supabase.auth.admin.getUserById(m.user_id as string);
      return {
        user_id: m.user_id as string,
        role: m.role as string,
        email: user.user?.email ?? null,
      };
    }),
  );

  const { data: invites } = await supabase
    .from("business_member_invites")
    .select("id, business_id, email, role, token, status, expires_at, created_at")
    .eq("business_id", businessId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  return { members: memberRows, invites: (invites as MemberInviteRow[]) ?? [] };
}

export async function createManagerInvite(opts: {
  supabase: SupabaseClient;
  businessId: string;
  businessTitle: string;
  invitedByUserId: string;
  inviterEmail: string | null;
  email: string;
}): Promise<MemberInviteRow> {
  const email = normalizeEmail(opts.email);
  if (!email.includes("@")) throw new Error("Enter a valid email address.");

  const { data: existingMember } = await opts.supabase
    .from("business_members")
    .select("user_id")
    .eq("business_id", opts.businessId);

  for (const row of existingMember ?? []) {
    const { data: user } = await opts.supabase.auth.admin.getUserById(row.user_id as string);
    if (user.user?.email?.toLowerCase() === email) {
      throw new Error("This person already manages this listing.");
    }
  }

  const { data: pending } = await opts.supabase
    .from("business_member_invites")
    .select("id")
    .eq("business_id", opts.businessId)
    .eq("status", "pending")
    .ilike("email", email)
    .maybeSingle();
  if (pending) throw new Error("An invite is already pending for this email.");

  const token = inviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const { data: invite, error } = await opts.supabase
    .from("business_member_invites")
    .insert({
      business_id: opts.businessId,
      email,
      role: "manager",
      token,
      invited_by: opts.invitedByUserId,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    })
    .select("id, business_id, email, role, token, status, expires_at, created_at")
    .single();

  if (error || !invite) throw new Error(error?.message ?? "Could not create invite");

  await sendPortalInviteEmail({
    to: email,
    businessTitle: opts.businessTitle,
    acceptUrl: acceptUrl(token),
    inviterEmail: opts.inviterEmail,
  });

  return invite as MemberInviteRow;
}

export async function revokeInvite(
  supabase: SupabaseClient,
  businessId: string,
  inviteId: string,
): Promise<void> {
  const { error } = await supabase
    .from("business_member_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("business_id", businessId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
}

export async function acceptInvite(opts: {
  supabase: SupabaseClient;
  token: string;
  userId: string;
  userEmail: string;
}): Promise<{ businessId: string; businessTitle: string }> {
  const { data: invite } = await opts.supabase
    .from("business_member_invites")
    .select("id, business_id, email, status, expires_at")
    .eq("token", opts.token.trim())
    .maybeSingle();

  if (!invite) throw new Error("Invite not found.");
  if ((invite.status as string) !== "pending") throw new Error("This invite is no longer valid.");
  if (new Date(invite.expires_at as string) < new Date()) {
    await opts.supabase
      .from("business_member_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);
    throw new Error("This invite has expired.");
  }

  if (normalizeEmail(opts.userEmail) !== normalizeEmail(String(invite.email))) {
    throw new Error("Sign in with the email address that received the invite.");
  }

  const businessId = invite.business_id as string;

  const { data: existing } = await opts.supabase
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", opts.userId)
    .maybeSingle();
  if (existing) throw new Error("You already manage this listing.");

  const { error: memberErr } = await opts.supabase.from("business_members").insert({
    business_id: businessId,
    user_id: opts.userId,
    role: "manager",
  });
  if (memberErr) throw new Error(memberErr.message);

  await opts.supabase
    .from("business_member_invites")
    .update({
      status: "accepted",
      accepted_by: opts.userId,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  const { data: biz } = await opts.supabase
    .from("businesses")
    .select("title")
    .eq("id", businessId)
    .maybeSingle();

  return { businessId, businessTitle: String(biz?.title ?? "your business") };
}

export async function removeManager(
  supabase: SupabaseClient,
  businessId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("business_members")
    .delete()
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("role", "manager");
  if (error) throw new Error(error.message);
}
