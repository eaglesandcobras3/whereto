import { fetchBusinessesForMarkdownCards } from "@/lib/data/markdown-business-cards";
import {
  extractBusinessCardSlugs,
  preprocessMarkdownForBusinessCards,
} from "@/lib/markdown/business-cards-syntax";
import { MarkdownBody } from "@/components/MarkdownBody";

type Props = {
  content: string;
  className?: string;
};

export async function MarkdownRenderer({ content, className = "" }: Props) {
  const slugs = extractBusinessCardSlugs(content);
  const businessCards =
    slugs.length > 0 ? await fetchBusinessesForMarkdownCards(slugs) : {};
  const processed = preprocessMarkdownForBusinessCards(content);

  return <MarkdownBody content={processed} businessCards={businessCards} className={className} />;
}
