import type { Metadata } from "next";
import Link from "next/link";
import { ListBusinessHomeCta } from "@/components/home/ListBusinessHomeCta";
import { SiteDocument } from "@/components/legal/SiteDocument";
import { PAGE_SECTION_CONTAINER_CLASS } from "@/lib/layout/page-section";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

export const metadata: Metadata = {
  ...canonicalAlternates("/about"),
  title: "About",
  description:
    "WhereTo30A was created by 30A locals to make it easier to discover restaurants, events, businesses, and things to do along the Emerald Coast.",
  ...openGraphForPage({
    path: "/about",
    title: "About | WhereTo30A",
    description:
      "Built by 30A locals to bring restaurants, events, businesses, and local experiences into one trusted place.",
  }),
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className={PAGE_SECTION_CONTAINER_CLASS}>
        <SiteDocument
          title="About WhereTo30A"
          description="Created by 30A locals to make it easier to discover everything the coast has to offer."
          layout="pageSection"
          embedded
          flushBottom
        >
          <p>
            WhereTo30A was created by 30A locals with a simple goal: to make it easier to discover everything 30A has to offer.
          </p>

          <p>
            We found ourselves searching across multiple websites, social media, and local groups just to find restaurants, events, businesses, and things to do. We wanted one trusted place where it all came together.
          </p>

          <p>
            With backgrounds in product design, technology, and digital experiences, we set out to build a platform that makes exploring 30A simpler for everyone.
          </p>

          <p>
            Our vision is to help visitors discover more, help locals stay connected, and support the incredible businesses that make this community so special.
          </p>

          <p>
            We&apos;re just getting started, and we&apos;re excited to continue growing alongside the 30A community.
          </p>

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
      </div>
      <ListBusinessHomeCta />
    </div>
  );
}
