import { MarkdownCollapsibleSectionsClient } from "@/components/content/MarkdownCollapsibleSectionsClient";
import { fetchBusinessesForMarkdownCards } from "@/lib/data/markdown-business-cards";
import {
  extractBusinessCardSlugs,
  preprocessMarkdownForBusinessCards,
} from "@/lib/markdown/business-cards-syntax";
import { splitMarkdownByH2 } from "@/lib/markdown/split-by-h2";

type Props = {
  content: string;
  fallbackTitle?: string;
  heading?: string;
  description?: string;
};

export async function MarkdownCollapsibleSections({
  content,
  fallbackTitle = "About",
  heading,
  description,
}: Props) {
  const rawSections = splitMarkdownByH2(content);
  if (rawSections.length === 0) return null;

  const slugs = extractBusinessCardSlugs(content);
  const businessCards =
    slugs.length > 0 ? await fetchBusinessesForMarkdownCards(slugs) : {};

  const sections = rawSections.map((section, index) => {
    const title =
      section.title ??
      (rawSections.length > 1 && index === 0 ? "Overview" : fallbackTitle);

    return {
      title,
      body: preprocessMarkdownForBusinessCards(section.body),
    };
  });

  return (
    <MarkdownCollapsibleSectionsClient
      sections={sections}
      businessCards={businessCards}
      heading={heading}
      description={description}
    />
  );
}
