import { notFound, permanentRedirect } from "next/navigation";
import { normalizeBusinessCategorySlug } from "@/lib/search/category-slugs";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { loadCategory } from "@/lib/data/category-hub";

type Props = { params: Promise<{ slug: string }> };

/** Permanent redirect: legacy `/categories/[slug]` → SEO hub path. */
export default async function LegacyCategoryRedirect({ params }: Props) {
  const { slug: raw } = await params;
  const slug = normalizeBusinessCategorySlug(raw) ?? raw.trim().toLowerCase();
  if (!slug) notFound();
  const cat = await loadCategory(slug);
  if (!cat) notFound();
  permanentRedirect(categoryHubPath(cat.slug));
}
