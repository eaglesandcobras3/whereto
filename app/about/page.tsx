import type { Metadata } from "next";
import Link from "next/link";
import { SiteDocument } from "@/components/legal/SiteDocument";

const siteUrl = "https://whereto30a.com";

export const metadata: Metadata = {
  title: "About",
  description:
    "WhereTo30A helps you discover restaurants, events, guides, and places along Florida's 30A and the Emerald Coast.",
  openGraph: {
    title: "About | WhereTo30A",
    description:
    "Local discovery for 30A and the Emerald Coast with curated listings, search, and town guides.",
    type: "website",
    url: `${siteUrl}/about`,
  },
};

export default function AboutPage() {
  return (
    <SiteDocument
      title="About WhereTo30A"
      description="Local discovery for Florida’s Emerald Coast, built for travelers and residents alike."
    >
      <p>
        WhereTo30A is a guide to the beach towns, businesses, events, and experiences along Highway 30A and the
        surrounding Emerald Coast. We combine curated listings with search and AI-assisted summaries so you can
        explore in plain language — whether you are planning a trip or looking for something new nearby.
      </p>

      <h2>What you will find</h2>
      <ul>
        <li>Town pages and guides that highlight character, dining, and things to do.</li>
        <li>Business listings with descriptions, tags, and links when provided by listing owners or sources.</li>
        <li>Events and editorial content aimed at helping you decide where to go next.</li>
      </ul>

      <h2>How we describe places</h2>
      <p>
        Some descriptions are drafted or refined with automated tools from factual inputs we control (for example,
        public business details and our own editorial notes). They are meant as a starting point for discovery, not
        as a substitute for checking hours, menus, pricing, or availability directly with a venue.
      </p>

      <h2>Listings and accuracy</h2>
      <p>
        Information changes quickly. We work to keep data useful and up to date, but we do not guarantee that every
        detail on the site is current. Always confirm important details with the business or event organizer.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about the site or a listing? Reach us at{" "}
        <a href="mailto:hello@whereto30a.com">hello@whereto30a.com</a>.
      </p>

      <p>
        <Link href="/search">Try search</Link>
        {" · "}
        <Link href="/guide">Browse the guide</Link>
      </p>
    </SiteDocument>
  );
}
