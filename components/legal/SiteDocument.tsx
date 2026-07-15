import Link from "next/link";
import type { ReactNode } from "react";
import { PAGE_SECTION_CONTAINER_CLASS } from "@/lib/layout/page-section";

type SiteDocumentProps = {
  title: string;
  description?: string;
  /** Extra content directly under the page description (same header stack). */
  afterDescription?: ReactNode;
  children: ReactNode;
  /** Use homepage section width instead of the default narrow document column. */
  layout?: "document" | "pageSection";
  /** Parent already applies {@link PAGE_SECTION_CONTAINER_CLASS} gutters. */
  embedded?: boolean;
  /** Drop bottom padding when a full-bleed section follows. */
  flushBottom?: boolean;
  /** Override the default top margin on the document body. */
  contentClassName?: string;
};

export function SiteDocument({
  title,
  description,
  afterDescription,
  children,
  layout = "document",
  embedded = false,
  flushBottom = false,
  contentClassName,
}: SiteDocumentProps) {
  const articleClass =
    layout === "pageSection"
      ? [
          "w-full max-w-none py-12 sm:py-16",
          embedded ? "px-0" : PAGE_SECTION_CONTAINER_CLASS,
          flushBottom ? "pb-0 sm:pb-0" : null,
        ]
          .filter(Boolean)
          .join(" ")
      : [
          "mx-auto max-w-3xl py-12 sm:py-16",
          embedded ? "px-0" : "px-4",
          flushBottom ? "pb-0 sm:pb-0" : null,
        ]
          .filter(Boolean)
          .join(" ");

  return (
    <article className={articleClass}>
      <nav className="mb-8 text-sm text-[var(--color-text-tertiary)]">
        <Link href="/" className="transition-colors hover:text-[var(--color-primary)]">
          Home
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[var(--color-text-secondary)]">{title}</span>
      </nav>
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-base text-[var(--color-text-secondary)]">{description}</p>
        ) : null}
        {afterDescription}
      </header>
      <div
        className={`prose prose-zinc max-w-none
        prose-headings:font-headline prose-headings:tracking-tight prose-headings:text-[var(--color-text-primary)]
        prose-h2:mt-10 prose-h2:text-xl
        prose-p:text-[var(--color-text-secondary)] prose-p:leading-relaxed
        prose-li:text-[var(--color-text-secondary)]
        prose-a:text-[var(--color-primary)] prose-a:no-underline hover:prose-a:underline
        prose-strong:text-[var(--color-text-primary)] ${contentClassName ?? "mt-10"}`}
      >
        {children}
      </div>
    </article>
  );
}
