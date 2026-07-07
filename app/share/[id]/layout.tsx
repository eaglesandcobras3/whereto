import type { Metadata } from "next";
import { getShareSnapshotMeta } from "@/lib/data/share-meta";
import { titleSegmentForLayoutTemplate } from "@/lib/seo/metadata-title";
import { openGraphForPage } from "@/lib/seo/social-metadata";

type MetaProps = { params: Promise<{ id: string }> };

/** Share snapshots are session-like; keep link equity on canonical hub/detail pages. */
const SHARE_NOINDEX: Pick<Metadata, "robots"> = {
  robots: { index: false, follow: false },
};

export async function generateMetadata({ params }: MetaProps): Promise<Metadata> {
  const { id } = await params;
  const meta = await getShareSnapshotMeta(id);
  const path = `/share/${id}`;
  if (!meta) {
    return {
      ...SHARE_NOINDEX,
      title: titleSegmentForLayoutTemplate("Shared results | WhereTo30A"),
      ...openGraphForPage({
        path,
        title: "Shared results | WhereTo30A",
        description: "Shared search results from WhereTo30A.",
      }),
    };
  }
  return {
    ...SHARE_NOINDEX,
    title: titleSegmentForLayoutTemplate(meta.title),
    description: meta.description,
    ...openGraphForPage({
      path,
      title: meta.title,
      description: meta.description,
    }),
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
