import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PortalPhotosClient } from "@/components/portal/PortalPhotosClient";
import { PortalShell } from "@/components/portal/PortalShell";
import { requireBusinessMember } from "@/lib/portal/require-business-member";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export const metadata: Metadata = {
  title: "Photos",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ businessId: string }>;
};

export default async function PortalBusinessPhotosPage({ params }: Props) {
  const { businessId } = await params;
  const member = await requireBusinessMember(businessId);
  if (!member) redirect("/portal");

  const supabase = getServiceSupabase();
  const { data: biz } = await supabase.from("businesses").select("id, title").eq("id", businessId).maybeSingle();
  if (!biz) notFound();

  return (
    <PortalShell>
      <PortalPhotosClient businessId={businessId} businessTitle={String(biz.title)} />
    </PortalShell>
  );
}
