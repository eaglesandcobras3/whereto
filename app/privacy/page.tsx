import type { Metadata } from "next";
import Link from "next/link";
import { SiteDocument } from "@/components/legal/SiteDocument";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

export const metadata: Metadata = {
  ...canonicalAlternates("/privacy"),
  title: "Privacy",
  description:
    "How WhereTo30A collects, uses, and shares information when you use our website and services.",
  ...openGraphForPage({
    path: "/privacy",
    title: "Privacy Policy | WhereTo30A",
    description: "Privacy practices for WhereTo30A covering accounts, analytics, and your choices.",
  }),
};

export default function PrivacyPage() {
  return (
    <SiteDocument
      title="Privacy Policy"
      description="Last updated: April 14, 2026. This policy describes how WhereTo30A (“we”, “us”) handles information when you use whereto30a.com and related services."
    >
      <h2>Information we collect</h2>
      <p>Depending on how you use the site, we may collect:</p>
      <ul>
        <li>
          <strong>Account information</strong> — if you create an account (for example, email and profile details you
          provide, and authentication data managed by our identity provider).
        </li>
        <li>
          <strong>Usage data</strong> — such as pages viewed, approximate region from IP address, device and browser
          type, and interactions with search or navigation features.
        </li>
        <li>
          <strong>Content you submit</strong> — for example, text you enter into forms, support messages, or other fields
          where you voluntarily send us information.
        </li>
      </ul>

      <h2>Cookies and similar technologies</h2>
      <p>
        We use cookies and similar technologies that are necessary for the site to function (for example, session and
        security cookies) and, where enabled, product analytics (PostHog) to understand aggregate usage and improve the
        product. You can control cookies through your browser settings; disabling some cookies may limit certain
        features.
      </p>

      <h2>How we use information</h2>
      <ul>
        <li>To operate, maintain, and secure the website and accounts.</li>
        <li>To personalize or improve search and discovery experiences.</li>
        <li>To measure performance, fix bugs, and develop new features.</li>
        <li>To communicate with you about the service or respond to inquiries.</li>
        <li>To comply with law and protect our rights and users.</li>
      </ul>

      <h2>Sharing</h2>
      <p>
        We use trusted service providers (for example, hosting, database, authentication, and analytics vendors) who
        process data on our behalf under agreements that limit use to providing the service. We may disclose
        information if required by law or to protect the safety and integrity of WhereTo30A and our users.
      </p>
      <p>We do not sell your personal information as that term is commonly understood under U.S. state privacy laws.</p>

      <h2>Retention</h2>
      <p>
        We keep information only as long as needed for the purposes above, unless a longer period is required by law.
        Technical logs may be retained for a limited time for security and troubleshooting.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Access or update certain account details through your profile where available.</li>
        <li>Request deletion of your account by contacting us; we will complete verifiable requests as required by law.</li>
        <li>Opt out of non-essential cookies where our tooling provides that option, in addition to browser controls.</li>
      </ul>

      <h2>Children</h2>
      <p>
        WhereTo30A is not directed at children under 13, and we do not knowingly collect personal information from
        children under 13. If you believe we have collected such information, contact us and we will take appropriate
        steps.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. We will post the revised version on this page and update the “Last
        updated” date above.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions:{" "}
        <a
          href="mailto:hello@whereto30a.com"
          {...gaClickProps({ event: "contact_click", category: "privacy", label: "email_privacy" })}
        >
          hello@whereto30a.com
        </a>
      </p>
      <p>
        <Link
          href="/terms"
          {...gaClickProps({ event: "nav_click", category: "privacy", label: "terms" })}
        >
          Terms of Service
        </Link>
      </p>
    </SiteDocument>
  );
}
