"use client";

import { type ReactNode } from "react";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { cn } from "@/lib/utils";

export type ContentTabSection = {
  id: string;
  title: string;
  content: ReactNode;
};

type Props = {
  sections: ContentTabSection[];
  heading?: string;
  description?: string;
  className?: string;
};

export function ContentSectionTabs({
  sections,
  heading,
  description,
  className,
}: Props) {
  if (sections.length === 0) return null;

  const showHeader = Boolean(heading || description);

  return (
    <section className={cn("space-y-4 sm:space-y-5", className)}>
      {showHeader ? (
        <SectionIntro heading={heading} description={description} />
      ) : null}

      <div>
        {sections.map((section, index) => (
          <CollapsibleSection
            key={section.id}
            variant="plain"
            defaultOpen={index === 0}
            trimTrailingSpace={index === sections.length - 1}
            title={section.title}
          >
            {section.content}
          </CollapsibleSection>
        ))}
      </div>
    </section>
  );
}

function SectionIntro({
  heading,
  description,
}: {
  heading?: string;
  description?: string;
}) {
  return (
    <div>
      {heading ? (
        <h2 className="font-headline text-xl font-bold text-foreground sm:text-2xl">
          {heading}
        </h2>
      ) : null}
      {description ? (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:mt-2">
          {description}
        </p>
      ) : null}
    </div>
  );
}
