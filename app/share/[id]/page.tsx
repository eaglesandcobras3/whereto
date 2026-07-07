import type { Metadata } from "next";
import { ArtifactShareView } from "@/components/share/ArtifactShareView";
import { LegacySharePage } from "@/components/share/LegacySharePage";
import { loadArtifactShareBySlug } from "@/lib/ask/load-artifact-share";

export const metadata: Metadata = {
  description: "Shared recommendations and search results from WhereTo30A.",
  robots: { index: false, follow: false },
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const artifactShare = await loadArtifactShareBySlug(id);

  if (artifactShare) {
    return (
      <ArtifactShareView
        title={artifactShare.title}
        summaryText={artifactShare.summary_text}
        artifact={artifactShare.artifact_snapshot}
      />
    );
  }

  return <LegacySharePage id={id} />;
}
