import type { Metadata } from "next";
import Link from "next/link";
import { SiteDocument } from "@/components/legal/SiteDocument";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

export const metadata: Metadata = {
  ...canonicalAlternates("/terms"),
  title: "Terms",
  description: "Terms of Service for using WhereTo30A and whereto30a.com.",
  ...openGraphForPage({
    path: "/terms",
    title: "Terms of Service | WhereTo30A",
    description: "Rules and disclaimers for using WhereTo30A.",
  }),
};

export default function TermsPage() {
  return (
    <SiteDocument
      title="Terms of Service"
      description="Last updated: May 21, 2026. By accessing or using WhereTo30A (“the Service”), you agree to these terms."
    >
      <h2>1. The Service</h2>
      <p>
        WhereTo30A provides an online guide to businesses, towns, events, and related content along Florida’s 30A
        corridor and the Emerald Coast. Features may change, and we may add or remove functionality without notice
        where permitted by law.
      </p>

      <h2>2. Eligibility and accounts</h2>
      <p>
        You must be able to form a binding contract in your jurisdiction to use account-based features. You are
        responsible for safeguarding your credentials and for activity under your account. Notify us if you suspect
        unauthorized access.
      </p>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service in violation of law or third-party rights.</li>
        <li>Attempt to gain unauthorized access to our systems, other users’ data, or underlying models or APIs except as we intentionally expose to you.</li>
        <li>Scrape, harvest, or overload the Service in a way that harms performance or circumvents rate limits or technical controls.</li>
        <li>Upload malware or interfere with the integrity or availability of the Service.</li>
      </ul>

      <h2>4. Content and intellectual property</h2>
      <p>
        The Service, including its design, text, graphics, logos, and software, is owned by WhereTo30A or its
        licensors and is protected by intellectual property laws. Subject to these Terms, we grant you a limited,
        non-exclusive, non-transferable license to access and use the Service for personal, non-commercial browsing
        unless we agree otherwise in writing.
      </p>
      <p>
        Listings and third-party names may be trademarks of their respective owners. Automated summaries or
        descriptions on the site do not imply endorsement by any business unless explicitly stated.
      </p>

      <h2>5. User content</h2>
      <p>
        If you submit content to us (for example, through forms or email), you represent that you have the rights to
        do so and you grant us a license to use, host, reproduce, and display that content as needed to operate and
        improve the Service.
      </p>
      <p>
        If you operate a business shown on WhereTo30A and you submit listing requests, corrections, ownership or claim correspondence,
        or branding materials, you represent that factual statements about your authority to act for the business, licensing,
        location, imagery rights, URLs, trademarks, allergens, ADA-related claims you ask us to publish, suitability claims, affiliation,
        accreditation, staffing, food-handling or sanitary assertions you invite us to echo—or other concrete factual assertions—are materially accurate to the best of your
        knowledge after reasonable inquiry. Knowing misrepresentations are misuse of the Service and may void good-faith cooperation.
      </p>

      <h2 id="directory-and-business-listings">6. Disclaimers</h2>

      <h3>6.1 General</h3>
      <p>
        The Service is provided <strong>“as is”</strong> and <strong>“as available”</strong>. Except where expressly stated in writing
        in a separate contract with you, we disclaim warranties implied by law or otherwise—including implied warranties of merchantability,
        fitness for a particular purpose, accuracy, completeness, uninterrupted operation, non-infringement, title, interoperability, latent
        defects, and conformity to descriptions—to the fullest extent permitted by applicable law.
      </p>
      <p>
        Operational facts (hours, prices, closures, tides, sanitation, allergens, ticketing, blackout dates, capacity, zoning, alcohol
        service rules, staffing, ADA accommodations, contractual terms, permitting, marina rules—the list is illustrative) often change faster
        than listings update. Readers should independently verify anything load-bearing directly with venues, organizers, licensees, landowners,
        municipalities and, when appropriate, professional advisers.
      </p>

      <h3 id="listing-information-scope">6.2 Business listings &amp; third-party information</h3>
      <p>
        Listings assemble names, excerpts, logistic fields, tagging, heuristic scores, illustrative imagery/icons, excerpts from licensees,
        ingestion partners, OCR, imports—and tooling-assisted rewriting. Taken together this material remains{" "}
        <strong>informational commentary and directory metadata</strong>, not inspected truth.
      </p>
      <ul>
        <li>
          WhereTo30A does <strong>not</strong> warrant that listings are current, truthful, omission-free, non-defamatory, allergen-perfect,
          safety-certified, medically sound, staffed as described, licensed as described, ADA-accurate, alcohol-regulation accurate for your
          situation, geographically correct, competitively ranked objective truth—or free of infringement.
        </li>
        <li>
          Inclusion, ordering, illustrative photography, typography, heuristic scores, conversational labels such as “Great for…” or comparative
          adjectives are editorial or automated convenience—not proof of endorsement, audited inspection or sponsorship unless a disclosure
          immediately adjacent plainly marks paid amplification.
        </li>
        <li>
          Tooling-assisted summaries can misstate logistical details beside otherwise accurate fields. Automation output is informational only—not
          legal, tax, medical, maritime-regulatory or other professional advice—even when tone sounds prescriptive.
        </li>
      </ul>
      <p>
        <strong>Correction policy.</strong> Share credible corrections through our{" "}
        <Link
          href="/feedback"
          {...gaClickProps({ event: "nav_click", category: "terms", label: "feedback_form" })}
        >
          listing feedback form
        </Link>—whether you&apos;re flagging inaccuracies, misleading comparisons, likeness disputes,
        scraped or imported duplicates, OCR or ingestion issues, suspected impersonations, discriminatory taxonomy that ought not remain, infringing or unlawful
        editorial copy; omission of plainly required disclosures when you identify the statute or rule and furnish substantiation—we
        review good-faith requests with commercially reasonable diligence and endeavor to annotate, downgrade prominence, correct—or remove
        offending material when warranted consistent with applicable law.
      </p>
      <p>
        Nothing in this policy guarantees a resolution, timetable, prominence, wording—or continued publication. Editors retain editorial
        discretion—including around speech equities, neutrality, contradictory records—or legal counsel—without committing to any particular
        result.
      </p>
      <p>Repeated abusive or duplicative demands do not accelerate review.</p>

      <p>
        <strong>Third-party dealings.</strong> Reservations, purchases, ticketing, contractor engagements, HOA or condominium matters,
        mooring bookings, employment decisions—or similar dealings—are solely between you and counterparties you independently select.
        WhereTo30A is not your broker, escrow agent, fiduciary, or insurer unless we separately execute a written agreement plainly stating otherwise.
      </p>

      <h2 id="limitation-of-liability">7. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, neither WhereTo30A nor its suppliers or licensors will be liable for your reliance on—or
        omissions within—business listings—including reputational portrayal, illustrative ranking—or automation errors—even ordinary
        negligence—except where applicable law forbids such exclusion (such as gross negligence, willful misconduct, or fraud as defined locally).
      </p>
      <p>
        To the fullest extent permitted by law, WhereTo30A and its suppliers will not be liable for any indirect,
        incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred
        directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from your use
        of or inability to use the Service.
      </p>
      <p>
        Our aggregate liability for claims arising out of or relating to the Service shall not exceed the greater of
        (a) the amount you paid us for the Service in the twelve months before the claim or (b) one hundred U.S.
        dollars (USD $100), if you have not paid us.
      </p>
      <p>
        Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the maximum permitted by law.
      </p>

      <h2>8. Indemnity</h2>
      <p>
        You will defend and indemnify WhereTo30A and its affiliates, directors, officers, employees, contractors, successors, and assigns from
        third-party claims, damages, judgments, settlements, liabilities, fines, and expenses—including reasonable attorneys’ fees—to the extent arising from your misuse of the Service or breach of these Terms.
      </p>
      <p>
        Operators who supply materials covered by Section 5—including onboarding forms, correction or claim correspondence, imagery,
        or factual statements about licensing, allergens, ADA suitability, alcohol service, minors, staffing, affiliation, accreditation,
        sanitary practices for regulated foodservice establishments, mooring authority, ticketing authority, franchisor instructions—or other fields you ask us to publish—must honor the accuracy obligations described there. Knowingly false, materially misleading, or infringing submissions that contribute to third-party claims may trigger defense and indemnification obligations to the widest extent enforced under Florida law and applicable federal statutes, excluding categories expressly declared non-indemnifiable.
      </p>

      <h2>9. Termination</h2>
      <p>
        We may suspend or terminate access to the Service at any time, with or without cause or notice. Provisions that
        by their nature should survive (including disclaimers, limitations of liability, and governing law) will
        survive termination.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of Florida, USA, without regard to conflict-of-law rules,
        except where preempted by applicable law. Courts in Walton County or another competent forum in Florida may
        have exclusive jurisdiction over disputes, unless a different venue is required by law.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may modify these Terms by posting an updated version on this page. Continued use after changes become
        effective constitutes acceptance of the revised Terms.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these Terms:{" "}
        <a
          href="mailto:hello@whereto30a.com"
          {...gaClickProps({ event: "contact_click", category: "terms", label: "email_terms" })}
        >
          hello@whereto30a.com
        </a>
      </p>
      <p>
        <Link
          href="/privacy"
          {...gaClickProps({ event: "nav_click", category: "terms", label: "privacy" })}
        >
          Privacy Policy
        </Link>
      </p>
    </SiteDocument>
  );
}
