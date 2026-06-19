import { requireBusinessMember } from "@/lib/portal/require-business-member";

export async function requireBusinessOwner(
  businessId: string,
): Promise<{ userId: string; role: string } | null> {
  const member = await requireBusinessMember(businessId);
  if (!member || member.role !== "owner") return null;
  return member;
}
