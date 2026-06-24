"use client";

import { MarkdownBody } from "@/components/MarkdownBody";
import { ContentSectionTabs } from "@/components/content/ContentSectionTabs";
import type { MarkdownBusinessCardData } from "@/lib/data/markdown-business-cards";

export type MarkdownSectionData = {
  title: string;
  body: string;
};

type Props = {
  sections: MarkdownSectionData[];
  businessCards: Record<string, MarkdownBusinessCardData | undefined>;
  heading?: string;
  description?: string;
};

export function MarkdownCollapsibleSectionsClient({
  sections,
  businessCards,
  heading = "In this guide",
  description = "Jump between topics below.",
}: Props) {
  if (sections.length === 0) return null;

  return (
    <ContentSectionTabs
      heading={heading}
      description={description}
      sections={sections.map((section, index) => ({
        id: `${section.title}-${index}`,
        title: section.title,
        content: <MarkdownBody content={section.body} businessCards={businessCards} compact />,
      }))}
    />
  );
}
