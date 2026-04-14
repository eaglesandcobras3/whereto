import Link from "next/link";
import type { ReactNode } from "react";

type SiteDocumentProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function SiteDocument({ title, description, children }: SiteDocumentProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
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
      </header>
      <div
        className="prose prose-zinc mt-10 max-w-none
        prose-headings:font-headline prose-headings:tracking-tight prose-headings:text-[var(--color-text-primary)]
        prose-h2:mt-10 prose-h2:text-xl
        prose-p:text-[var(--color-text-secondary)] prose-p:leading-relaxed
        prose-li:text-[var(--color-text-secondary)]
        prose-a:text-[var(--color-primary)] prose-a:no-underline hover:prose-a:underline
        prose-strong:text-[var(--color-text-primary)]"
      >
        {children}
      </div>
    </article>
  );
}
