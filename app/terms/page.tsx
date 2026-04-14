import type { Metadata } from "next";
import Link from "next/link";
import { SiteDocument } from "@/components/legal/SiteDocument";

const siteUrl = "https://whereto30a.com";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of Service for using WhereTo30A and whereto30a.com.",
  openGraph: {
    title: "Terms of Service | WhereTo30A",
    description: "Rules and disclaimers for using WhereTo30A.",
    type: "website",
    url: `${siteUrl}/terms`,
  },
};

export default function TermsPage() {
  return (
    <SiteDocument
      title="Terms of Service"
      description="Last updated: April 14, 2026. By accessing or using WhereTo30A (“the Service”), you agree to these terms."
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

      <h2>6. Disclaimers</h2>
      <p>
        The Service is provided <strong>“as is”</strong> and <strong>“as available”</strong>. Hours, prices, menus,
        availability, and event details change. We do not warrant that information on the site is complete, accurate,
        or current. Decisions you make based on the Service are your own; verify important details with venues and
        organizers.
      </p>
      <p>
        AI-assisted or generated text is informational only and may contain errors. It is not professional advice
        (including legal, medical, or financial advice).
      </p>

      <h2>7. Limitation of liability</h2>
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
      <p>Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the maximum permitted by law.</p>

      <h2>8. Indemnity</h2>
      <p>
        You will defend and indemnify WhereTo30A and its affiliates, officers, and employees from any claims, damages,
        losses, or expenses (including reasonable attorneys’ fees) arising from your misuse of the Service or violation
        of these Terms.
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
        Questions about these Terms: <a href="mailto:hello@whereto30a.com">hello@whereto30a.com</a>
      </p>
      <p>
        <Link href="/privacy">Privacy Policy</Link>
      </p>
    </SiteDocument>
  );
}
