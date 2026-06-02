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
    "Why WhereTo30A exists, how listings are informational (not audited), corrections, architecture, data security.",
  ...openGraphForPage({
    path: "/about",
    title: "About | WhereTo30A",
    description:
      "A practical guide and directory for Highway 30A and the Emerald Coast — built responsibly and served securely.",
  }),
};

export default function AboutPage() {
  return (
    <SiteDocument
      title="About WhereTo30A"
      description="A reader-first guide to the beach towns and local scene along Scenic Highway 30A — curated listings, editorial guides, and search without losing the nuance of the place."
    >
      <p>
        Trip planning shouldn&apos;t rely only on fragmented reviews and mystery algorithms. WhereTo30A exists because we wanted a steadier compass for the Emerald Coast — town context, standout businesses, editorial guides, and discovery flows that favor clarity over hype. Human curation anchors the catalog; assistive tooling tightens summaries once factual inputs are ours to control. The goal is quicker orientation, not telling you how to enjoy your week.
      </p>

      <aside className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        Disclaimers, caps on monetary damages, and indemnities that apply when we depict businesses appear in{" "}
        <Link
          href="/terms#directory-and-business-listings"
          {...gaClickProps({ event: "nav_click", category: "about", label: "terms_section_6-8" })}
          className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          Terms&nbsp;§&nbsp;6–8
        </Link>{" "}
        (effective May&nbsp;21,&nbsp;2026). This narrative is explanatory only—it{" "}
        <strong className="text-[var(--color-text-primary)]">does not modify those Terms.</strong> Operators with commercial or regulatory stakes should consult qualified advisers and rely on Sections 6–8 for binding language where it matters commercially.
      </aside>

      <h2>What you&apos;ll find</h2>
      <ul>
        <li>Town pages that stress character, pacing, and beach-access reality.</li>
        <li>Listings built from operator data and editorial notes — curated, not an open review firehose.</li>
        <li>Events, guides, and search that narrow the gap between curiosity and a verified plan.</li>
      </ul>

      <h2>Listings &amp; what we disclaim</h2>
      <p>
        Venues evolve faster than editorial cycles can refresh. Listing content—including automation-assisted summaries, tags,
        heuristic scores, imagery, ingestion fields, excerpts of licensed data—is provided for{" "}
        <strong>traveler orientation</strong>; it{" "}
        <strong>is not</strong> audited truth or an invitation to waive your own confirmations with operators and professionals about allergens,
        tides, ADA accommodations, minors, alcohol service, staffing or licensing assertions, mooring rules, ticketing and pricing commitments,
        or other decisive facts covered by statute contract or prudent risk management elsewhere.
      </p>
      <p>
        <strong>Readers.</strong> Confirm load-bearing specifics onsite, by telephone, ticketing channels, landowners, harbormasters, or municipalities—not solely from our synopsis.
      </p>
      <p>
        <strong>Owners &amp; operators.</strong> Facts you submit through onboarding, claims, corrections, imagery, attribution, or rebranding inquiries must be accurate to the best of your knowledge after reasonable inquiry. Knowing misrepresentation may void good-faith cooperation and can trigger indemnities described beside representation clauses inside{" "}
        <Link
          href="/terms#directory-and-business-listings"
          {...gaClickProps({ event: "nav_click", category: "about", label: "terms_owners" })}
          className="font-medium underline-offset-4 hover:underline"
        >
          Terms&nbsp;§&nbsp;5–8
        </Link>
        .
      </p>
      <p>
        <strong>Corrections.</strong> Flag inaccuracies scraped duplicates ingestion mismatches likeness disputes omitted lawful disclosures discriminatory classifications or other harmful erroneous material—with details—via{" "}
        <Link
          href="/feedback"
          {...gaClickProps({ event: "nav_click", category: "about", label: "feedback_form" })}
          className="font-medium underline-offset-4 hover:underline"
        >
          the corrections form
        </Link>{" "}
        or{" "}
        <a
          href="mailto:feedback@whereto30a.com"
          {...gaClickProps({ event: "contact_click", category: "about", label: "email_feedback" })}
          className="font-medium underline-offset-4 hover:underline"
        >
          feedback@whereto30a.com
        </a>
        . We review credible requests with commercially reasonable diligence subject to discretionary editorial pacing; see procedure at{" "}
        <Link
          href="/terms#listing-information-scope"
          {...gaClickProps({ event: "nav_click", category: "about", label: "terms_listing_scope" })}
          className="font-medium underline-offset-4 hover:underline"
        >
          Terms&nbsp;§&nbsp;6.2
        </Link>
        .
      </p>
      <p>
        To the fullest extent permitted by law—including disappointed expectations, reputational disagreement, ranking placement, automation-assisted tone, or ingestion latency—we disclaim economic fallout beyond monetary caps enumerated in{" "}
        <Link
          href="/terms#limitation-of-liability"
          {...gaClickProps({ event: "nav_click", category: "about", label: "terms_liability" })}
          className="font-medium underline-offset-4 hover:underline"
        >
          Terms&nbsp;§&nbsp;7
        </Link>
        {" "}
        (together with Sections 8–11 on indemnity, survival, governing law, revisions, contact).
      </p>

      <h2>How we describe places</h2>
      <p>
        Some blurbs pair editor notes with automation to stay readable at scale. They remain fallible — verify anything load-bearing on-site or over the phone.
      </p>

      <h2>Architecture &amp; data access</h2>
      <pre className="whitespace-pre-wrap rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
        {`Visitor browser
↓
Next.js routes (React Server Components + Route Handlers)
↓ privileged queries & secrets remain on the server
Supabase Postgres + Storage`}
      </pre>
      <p>
        Public browsing does <strong>not</strong> open direct Supabase Postgres access from raw browser JavaScript with service-role credentials — listing payloads, aggregates,
        transactional email, and other sensitive flows run through Next.js on the server. The publishable browser key Supabase exposes is confined to narrowly scoped behaviors (such as refreshing auth cookies in middleware) and never replaces that server boundary for editorial data.
      </p>

      <h2>List your business</h2>
      <p>
        New listings funnel through{" "}
        <Link
          href="/list-your-business"
          {...gaClickProps({ event: "nav_click", category: "about", label: "list_business" })}
          className="font-medium underline-offset-4 hover:underline"
        >
          List your business
        </Link>
        . Editors review submissions before anything goes live inside our publishing workflow.
      </p>

      <h2>Contact</h2>
      <p>
        General inbox:{" "}
        <a
          href="mailto:hello@whereto30a.com"
          {...gaClickProps({ event: "contact_click", category: "about", label: "email_hello" })}
          className="font-medium underline-offset-4 hover:underline"
        >
          hello@whereto30a.com
        </a>
      </p>
      <p>
        Listing QA / experiential feedback:{" "}
        <a
          href="mailto:feedback@whereto30a.com"
          {...gaClickProps({ event: "contact_click", category: "about", label: "email_feedback_contact" })}
          className="font-medium underline-offset-4 hover:underline"
        >
          feedback@whereto30a.com
        </a>{" "}
        ·{" "}
        <Link
          href="/feedback"
          {...gaClickProps({ event: "nav_click", category: "about", label: "feedback_form_contact" })}
          className="font-medium underline-offset-4 hover:underline"
        >
          corrections form
        </Link>
      </p>
    </SiteDocument>
  );
}
