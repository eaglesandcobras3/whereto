import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalTeamClient } from "@/components/portal/PortalTeamClient";
import { requireBusinessOwner } from "@/lib/portal/require-business-owner";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export const metadata: Metadata = {
  title: "Team",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ businessId: string }>;
};

export default async function PortalTeamPage({ params }: Props) {
  const { businessId } = await params;
  const member = await requireBusinessOwner(businessId);
  if (!member) redirect("/portal");

  const supabase = getServiceSupabase();
  const { data: biz } = await supabase.from("businesses").select("id, title").eq("id", businessId).maybeSingle();
  if (!biz) notFound();

  return (
    <PortalShell>
      <PortalTeamClient businessId={businessId} businessTitle={String(biz.title)} />
    </PortalShell>
  );
}
