import type { CategoryHubFaq } from "@/lib/seo/category-hub-substance";

type Props = {
  faqs: CategoryHubFaq[];
  title?: string;
};

/**
 * Visible FAQ block for category hubs (also mirrored in FAQPage JSON-LD by the parent).
 */
export function CategoryHubFaqSection({ faqs, title = "Planning notes" }: Props) {
  if (faqs.length === 0) return null;

  return (
    <section className="space-y-4 sm:space-y-6" aria-labelledby="category-hub-faq-heading">
      <div>
        <h2
          id="category-hub-faq-heading"
          className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl"
        >
          {title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mt-2">
          Quick answers for how this hub is organized along 30A.
        </p>
      </div>
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <details
            key={faq.question}
            className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 open:pb-4"
            open={index === 0 ? true : undefined}
          >
            <summary className="cursor-pointer list-none font-headline text-base font-semibold text-[var(--color-text-primary)] marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-start justify-between gap-3">
                {faq.question}
                <span
                  className="material-symbols-outlined shrink-0 text-xl text-[var(--color-text-tertiary)] transition group-open:rotate-180"
                  aria-hidden
                >
                  expand_more
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
