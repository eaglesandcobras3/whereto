"use client";

import Link from "next/link";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { isDiscoverEnabled, isRentalsEnabled } from "@/lib/feature-flags-core";
import { discoverHref } from "@/lib/nav/discovery-links";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

const footerLinkClass =
  "text-[0.6875rem] leading-[1.35] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]";

export function FooterCompanyLinks() {
  const flags = useAppFeatureFlags();
  const rentalsEnabled = isRentalsEnabled(flags);
  const discoverOn = isDiscoverEnabled(flags);

  const companyLinks = [
    {
      name: "About",
      href: "/about",
      ...gaClickProps({ event: "nav_click", category: "footer_company", label: "about" }),
    },
    {
      name: "Travel guides",
      href: "/guides",
      ...gaClickProps({ event: "nav_click", category: "footer_company", label: "travel_guides" }),
    },
    {
      name: "Businesses",
      href: discoverOn ? discoverHref(flags) : "/businesses",
      ...gaClickProps({ event: "nav_click", category: "footer_company", label: "businesses" }),
    },
    ...(discoverOn
      ? [
          {
            name: "Categories",
            href: "/businesses",
            ...gaClickProps({
              event: "nav_click",
              category: "footer_company",
              label: "categories",
            }),
          },
        ]
      : []),
    {
      name: "List your business",
      href: "/list-your-business",
      ...gaClickProps({ event: "cta_click", category: "footer_company", label: "list_your_business" }),
    },
    ...(rentalsEnabled
      ? [
          {
            name: "List a vacation rental",
            href: "/list-your-rentals",
            ...gaClickProps({
              event: "cta_click",
              category: "footer_company",
              label: "list_your_rentals",
            }),
          },
        ]
      : []),
    {
      name: "Privacy",
      href: "/privacy",
      ...gaClickProps({ event: "nav_click", category: "footer_company", label: "privacy" }),
    },
    {
      name: "Terms",
      href: "/terms",
      ...gaClickProps({ event: "nav_click", category: "footer_company", label: "terms" }),
    },
  ];

  return (
    <ul className="flex flex-col gap-0.5">
      {companyLinks.map((link) => {
        const { name, href, ...analytics } = link;
        return (
          <li key={name}>
            <Link href={href} {...analytics} className={footerLinkClass}>
              {name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
