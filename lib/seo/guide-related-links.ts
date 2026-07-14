import {
  GUIDE_INTENT_MAP,
  type GuideIntentMapping,
  guideIntentForSlug,
} from "@/lib/seo/guide-intent-clusters";

export type RelatedGuideLink = {
  slug: string;
  title: string;
  href: string;
  reason?: string;
};

const SLUG_TITLE_OVERRIDES: Record<string, string> = {
  ...Object.fromEntries(GUIDE_INTENT_MAP.map((m) => [m.slug, titleFromSlug(m.slug)])),
  "bachelorette-girls-trip-30a": "Weekend with friends on 30A",
  "guide-to-rosemary-beach-florida": "Rosemary Beach guide",
};

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Curated internal links for a guide — pillar, cluster siblings, and cluster peers. */
export function relatedGuidesForSlug(slug: string, limit = 6): RelatedGuideLink[] {
  const intent = guideIntentForSlug(slug);
  const out: RelatedGuideLink[] = [];
  const seen = new Set<string>([slug]);

  if (intent?.pillarSlug) {
    seen.add(intent.pillarSlug);
    out.push({
      slug: intent.pillarSlug,
      title: SLUG_TITLE_OVERRIDES[intent.pillarSlug] ?? titleFromSlug(intent.pillarSlug),
      href: `/guide/${intent.pillarSlug}`,
      reason: "Pillar guide",
    });
  }

  if (intent) {
    const clusterPeers = GUIDE_INTENT_MAP.filter(
      (m) => m.cluster === intent.cluster && m.slug !== slug && m.slug !== intent.pillarSlug,
    );
    for (const peer of clusterPeers) {
      if (seen.has(peer.slug)) continue;
      seen.add(peer.slug);
      out.push({
        slug: peer.slug,
        title: SLUG_TITLE_OVERRIDES[peer.slug] ?? titleFromSlug(peer.slug),
        href: `/guide/${peer.slug}`,
        reason: peer.primaryKeyword,
      });
      if (out.length >= limit) return out;
    }
  }

  const crossCluster: GuideIntentMapping[] = [
    guideIntentForSlug("ultimate-30a-first-timers-guide"),
    guideIntentForSlug("public-beaches-30a"),
    guideIntentForSlug("family-friendly-30a-beach-vacation"),
  ].filter((m): m is GuideIntentMapping => Boolean(m));

  for (const m of crossCluster) {
    if (seen.has(m.slug)) continue;
    seen.add(m.slug);
    out.push({
      slug: m.slug,
      title: SLUG_TITLE_OVERRIDES[m.slug] ?? titleFromSlug(m.slug),
      href: `/guide/${m.slug}`,
      reason: m.primaryKeyword,
    });
    if (out.length >= limit) break;
  }

  return out.slice(0, limit);
}
