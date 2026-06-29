import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  serviceBrowseGroupFromPublicSegment,
  serviceBrowseGroupPublicSegment,
} from "@/lib/service-categories/browse-group-nav";
import { SERVICE_CATEGORY_GROUP_SLUGS } from "@/lib/service-categories/groups";
import {
  buildServiceBrowseGroupHubMetadata,
  loadServiceBrowseGroupHubPage,
} from "@/lib/data/service-browse-group-hub";
import { ServiceBrowseGroupHubView } from "@/components/services/ServiceBrowseGroupHubView";

export const revalidate = 3600;

type Props = { params: Promise<{ groupSlug: string }> };

export async function generateStaticParams(): Promise<{ groupSlug: string }[]> {
  return SERVICE_CATEGORY_GROUP_SLUGS.map((slug) => ({
    groupSlug: serviceBrowseGroupPublicSegment(slug),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupSlug: raw } = await params;
  const groupSlug = serviceBrowseGroupFromPublicSegment(raw);
  if (!groupSlug) return { title: "Services" };
  return buildServiceBrowseGroupHubMetadata(groupSlug);
}

export default async function ServiceBrowseGroupPage({ params }: Props) {
  const { groupSlug: raw } = await params;
  const groupSlug = serviceBrowseGroupFromPublicSegment(raw);
  if (!groupSlug) notFound();

  const hub = await loadServiceBrowseGroupHubPage(groupSlug);
  if (!hub) notFound();

  return <ServiceBrowseGroupHubView hub={hub} />;
}
