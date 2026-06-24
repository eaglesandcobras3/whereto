"use client";

import { type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const tabsKey = sections.map((s) => s.id).join("|");

  if (sections.length === 1) {
    const section = sections[0]!;
    return (
      <section className={cn("space-y-4 sm:space-y-5", className)}>
        {showHeader ? (
          <SectionIntro heading={heading} description={description} />
        ) : null}
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <h3 className="font-headline text-lg font-bold text-foreground sm:text-xl">
              {section.title}
            </h3>
          </div>
          <div className="px-5 py-6 sm:px-6 sm:py-7">{section.content}</div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("space-y-4 sm:space-y-5", className)}>
      {showHeader ? (
        <SectionIntro heading={heading} description={description} />
      ) : null}

      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        <Tabs key={tabsKey} defaultValue={sections[0]!.id} className="flex-col gap-0">
          <TabsList
            variant="line"
            className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-border bg-transparent p-0 scrollbar-hide"
          >
            {sections.map((section, index) => (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className={cn(
                  "h-auto flex-none rounded-none px-4 py-3.5 text-sm font-semibold sm:px-5 sm:py-4",
                  "data-active:text-primary data-active:after:bg-primary",
                  index < sections.length - 1 &&
                    "border-r border-border",
                )}
              >
                {section.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {sections.map((section) => (
            <TabsContent
              key={section.id}
              value={section.id}
              className="px-5 py-6 sm:px-6 sm:py-7"
            >
              {section.content}
            </TabsContent>
          ))}
        </Tabs>
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
