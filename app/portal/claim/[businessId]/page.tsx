import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortalClaimForm } from "@/components/portal/PortalClaimForm";
import { PortalShell } from "@/components/portal/PortalShell";
import { getServiceSupabase } from "@/lib/supabase/service-role";

type Props = { params: Promise<{ businessId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { businessId } = await params;
  const supabase = getServiceSupabase();
  const { data } = await supabase.from("businesses").select("title").eq("id", businessId).maybeSingle();
  return {
    title: data ? `Claim ${(data as { title: string }).title}` : "Claim business",
    robots: { index: false, follow: false },
  };
}

export default async function PortalClaimPage({ params }: Props) {
  const { businessId } = await params;
  const supabase = getServiceSupabase();
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, title, claim_status")
    .eq("id", businessId)
    .maybeSingle();

  if (!biz) notFound();

  return (
    <PortalShell active="dashboard">
      <h2 className="font-headline text-xl font-semibold text-[var(--color-text-primary)]">
        Claim {(biz.title as string) ?? "this business"}
      </h2>
      <PortalClaimForm
        businessId={biz.id as string}
        businessTitle={String(biz.title ?? "this business")}
        claimStatus={(biz.claim_status as string) ?? "unclaimed"}
      />
    </PortalShell>
  );
}
