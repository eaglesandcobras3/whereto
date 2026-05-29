import type { Metadata } from "next";
import { getShareSnapshotMeta } from "@/lib/data/share-meta";
import { titleSegmentForLayoutTemplate } from "@/lib/seo/metadata-title";
import { getSiteUrl } from "@/lib/site-url";

type MetaProps = { params: Promise<{ id: string }> };

/** Share snapshots are session-like; keep link equity on canonical hub/detail pages. */
const SHARE_NOINDEX: Pick<Metadata, "robots"> = {
  robots: { index: false, follow: true },
};

export async function generateMetadata({ params }: MetaProps): Promise<Metadata> {
  const { id } = await params;
  const meta = await getShareSnapshotMeta(id);
  const base = getSiteUrl();
  const url = `${base}/share/${id}`;
  if (!meta) {
    return {
      ...SHARE_NOINDEX,
      title: titleSegmentForLayoutTemplate("Shared results | WhereTo30A"),
      openGraph: { url, siteName: "WhereTo30A", type: "website" },
    };
  }
  return {
    ...SHARE_NOINDEX,
    title: titleSegmentForLayoutTemplate(meta.title),
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url,
      siteName: "WhereTo30A",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: meta.title,
      description: meta.description,
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
