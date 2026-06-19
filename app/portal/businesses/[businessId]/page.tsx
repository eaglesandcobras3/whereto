import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PortalBusinessEditForm } from "@/components/portal/PortalBusinessEditForm";
import { PortalShell } from "@/components/portal/PortalShell";
import { requireBusinessMember } from "@/lib/portal/require-business-member";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export const metadata: Metadata = {
  title: "Edit listing",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ businessId: string }>;
};

export default async function PortalBusinessEditPage({ params }: Props) {
  const { businessId } = await params;
  const member = await requireBusinessMember(businessId);
  if (!member) redirect("/portal");

  const supabase = getServiceSupabase();
  const { data: biz } = await supabase.from("businesses").select("id, title").eq("id", businessId).maybeSingle();
  if (!biz) notFound();

  return (
    <PortalShell>
      <PortalBusinessEditForm businessId={businessId} />
    </PortalShell>
  );
}
