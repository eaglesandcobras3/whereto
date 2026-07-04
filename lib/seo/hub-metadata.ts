import type { Metadata } from "next";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import {
  metaDescriptionSnippet,
  seoTitleSegmentForLayout,
} from "@/lib/seo/metadata-snippets";
import { openGraphForPage } from "@/lib/seo/social-metadata";

/** SERP-optimized hub metadata from SEO audit (titles fit layout budget). */
export function homePageMetadata(ogImageUrl?: string | null): Metadata {
  const title = "WhereTo30A: 30A Travel Guide, Towns, Beaches & Local Picks";
  const description =
    "Plan your 30A trip with local guides to beach towns, restaurants, shopping, beach access, and Emerald Coast travel tips.";
  return {
    ...canonicalAlternates("/"),
    title: { absolute: title },
    description,
    ...openGraphForPage({ path: "/", title, description, imageUrl: ogImageUrl }),
  };
}

export function guidesHubMetadata(): Metadata {
  const title = seoTitleSegmentForLayout(
    "30A Travel Guides: Beach Access, Town Tips & Trip Planning",
  );
  const description = metaDescriptionSnippet(
    "Explore 30A travel guides for first-timers, beach access, family trips, dining, and local planning advice across South Walton.",
    "Explore 30A travel guides for first-timers, beach access, family trips, dining, and local planning advice across South Walton.",
  );
  return {
    ...canonicalAlternates("/guides"),
    title,
    description,
    ...openGraphForPage({ path: "/guides", title: `${title} | WhereTo30A`, description }),
  };
}

export function townsHubMetadata(): Metadata {
  const title = seoTitleSegmentForLayout(
    "30A Beach Towns Guide: Compare Rosemary, Seaside, Alys & More",
  );
  const description = metaDescriptionSnippet(
    "Compare the best 30A towns by vibe, beach access, walkability, family fit, and where to stay.",
    "Compare the best 30A towns by vibe, beach access, walkability, family fit, and where to stay.",
  );
  return {
    ...canonicalAlternates("/towns"),
    title,
    description,
    ...openGraphForPage({ path: "/towns", title: `${title} | WhereTo30A`, description }),
  };
}

const CATEGORY_HUB_COPY: Record<
  string,
  { titleSegment: string; description: string }
> = {
  restaurants: {
    titleSegment: "Restaurants on 30A: Best Places to Eat by Town",
    description:
      "Find the best restaurants on 30A, from casual brunch and seafood to date-night dinners in Rosemary, Seaside, Alys, and more.",
  },
  shopping: {
    titleSegment: "Shopping on 30A: Boutiques, Town Centers & Local Stores",
    description:
      "Discover the best shopping on 30A, including boutiques, town centers, gifts, and local stores from Rosemary Beach to Seaside.",
  },
};

export function categoryHubMetadataFromAudit(
  slug: string,
  path: string,
  fallbackTitle: string,
  fallbackDescription: string,
): Pick<Metadata, "title" | "description"> & ReturnType<typeof openGraphForPage> {
  const copy = CATEGORY_HUB_COPY[slug];
  const title = seoTitleSegmentForLayout(copy?.titleSegment ?? fallbackTitle);
  const description = metaDescriptionSnippet(
    copy?.description ?? fallbackDescription,
    fallbackDescription,
  );
  return {
    title,
    description,
    ...openGraphForPage({
      path,
      title: `${title} | WhereTo30A`,
      description,
    }),
  };
}

export function townPageMetadataFromAudit(
  townName: string,
  townSlug: string,
  seoTitle: string | null | undefined,
  seoDescription: string | null | undefined,
  fallbackDescription: string,
  imageUrl?: string | null,
): Metadata {
  const auditDefaults: Record<string, { title: string; description: string }> = {
    seaside: {
      title: "Seaside Florida Travel Guide: Where to Stay, Eat & Go to the Beach",
      description:
        "Plan a trip to Seaside, Florida with local tips on where to stay, beach access, restaurants, shopping, and nearby spots on 30A.",
    },
    "inlet-beach": {
      title: "Inlet Beach Travel Guide: Where to Stay, Eat & Explore on 30A",
      description:
        "Discover Inlet Beach with local tips on beach access, where to stay, 30Avenue, restaurants, and nearby 30A highlights.",
    },
  };
  const audit = auditDefaults[townSlug];
  const title = seoTitleSegmentForLayout(
    seoTitle?.trim() || audit?.title || `${townName} Florida Travel Guide`,
  );
  const description = metaDescriptionSnippet(
    seoDescription?.trim() || audit?.description || fallbackDescription,
    fallbackDescription,
  );
  return {
    ...canonicalAlternates(`/${townSlug}`),
    title,
    description,
    ...openGraphForPage({
      path: `/${townSlug}`,
      title: `${townName} | WhereTo30A`,
      description,
      imageUrl,
    }),
  };
}
