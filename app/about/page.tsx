import type { Metadata } from "next";
import Link from "next/link";
import { SiteDocument } from "@/components/legal/SiteDocument";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

export const metadata: Metadata = {
  ...canonicalAlternates("/about"),
  title: "About",
  description:
    "Locals along Scenic Highway 30A built WhereTo30A to help visitors and neighbors find the businesses that make this coast worth knowing.",
  ...openGraphForPage({
    path: "/about",
    title: "About | WhereTo30A",
    description:
      "A local guide to Highway 30A and the Emerald Coast, built by people who live here.",
  }),
};

export default function AboutPage() {
  return (
    <SiteDocument
      title="About WhereTo30A"
      description="A local guide to Scenic Highway 30A, built by people who live here."
    >
      <p>
        We&apos;re locals along 30A. We built WhereTo30A because we kept sending the same restaurant, beach, and shop recommendations to friends visiting from out of town, and we wanted one place that felt like the guide we&apos;d actually hand someone at the house.
      </p>

      <p>
        Whether you&apos;re here for a week or you live here year-round, the goal is the same: showcase the businesses that make this stretch special and make them easier to find. Town pages, standout spots, guides, and search that gets you to a real place without wading through noise.
      </p>

      <h2>What you&apos;ll find</h2>
      <ul>
        <li>Town pages along Scenic Highway 30A.</li>
        <li>Curated business listings from operators and our own notes.</li>
        <li>Guides, events, and search to help you plan a day or discover something new.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        Questions or suggestions:{" "}
        <a
          href="mailto:hello@whereto30a.com"
          {...gaClickProps({ event: "contact_click", category: "about", label: "email_hello" })}
          className="font-medium underline-offset-4 hover:underline"
        >
          hello@whereto30a.com
        </a>
      </p>
      <p>
        Spotted something wrong on a listing?{" "}
        <Link
          href="/feedback"
          {...gaClickProps({ event: "nav_click", category: "about", label: "feedback_form_contact" })}
          className="font-medium underline-offset-4 hover:underline"
        >
          Send us a correction
        </Link>
        .
      </p>
    </SiteDocument>
  );
}
