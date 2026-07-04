import Link from "next/link";
import { generateBreadcrumbSchema } from "@/lib/seo/breadcrumb-schema";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

type Crumb = { name: string; href: string; current?: boolean };

type Props = {
  items: Crumb[];
  analyticsCategory?: string;
};

export function HubBreadcrumbs({ items, analyticsCategory = "hub_breadcrumb" }: Props) {
  const schemaItems = items.map((item) => ({
    name: item.name,
    url: item.href,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateBreadcrumbSchema(schemaItems)) }}
      />
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm" aria-label="Breadcrumb">
        {items.map((item, i) => (
          <span key={item.name} className="flex items-center gap-2">
            {i > 0 ? (
              <span className="text-[var(--color-border-strong)]" aria-hidden>
                /
              </span>
            ) : null}
            {item.current ? (
              <span className="text-[var(--color-text-secondary)]">{item.name}</span>
            ) : (
              <Link
                href={item.href}
                {...gaClickProps({
                  event: "nav_click",
                  category: analyticsCategory,
                  label: item.name.toLowerCase().replace(/\s+/g, "_"),
                })}
                className="text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-primary)]"
              >
                {item.name}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
