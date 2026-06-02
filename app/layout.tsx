import type { Metadata } from "next";
import { Inter, Manrope, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { AnalyticsClickCapture } from "@/components/analytics/AnalyticsClickCapture";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NavbarServer } from "@/components/NavbarServer";
import { SiteFooter } from "@/components/home/SiteFooter";
import { getSiteUrl } from "@/lib/site-url";
import { defaultOpenGraphImageUrl } from "@/lib/seo/social-metadata";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Evaluate on each invocation — not at module load — so deployed HTML/schema keep the right
 * origin after env-based domain fixes (critical for canonical + OG across non-home routes).
 */
export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const base = new URL(siteUrl);
  const ogImage = defaultOpenGraphImageUrl();
  const ogTitle = "WhereTo30A | Local Guide to Florida's 30A & Emerald Coast";
  const ogDescription =
    "Your complete local guide to 30A and Florida's Emerald Coast. Discover beach towns, restaurants, shops, events, and insider tips.";

  return {
    metadataBase: base,
    title: {
      default: "WhereTo30A | Local Guide to Florida's 30A & Emerald Coast",
      template: "%s | WhereTo30A",
    },
    description:
      "Your complete local guide to 30A and Florida's Emerald Coast. Discover beach towns, restaurants, shops, events, and insider tips from Rosemary Beach to Seaside.",
    keywords: [
      "30A",
      "30A Florida",
      "Emerald Coast",
      "Rosemary Beach",
      "Seaside Florida",
      "Alys Beach",
      "Grayton Beach",
      "30A restaurants",
      "30A things to do",
      "30A vacation",
      "30A beach towns",
      "Florida panhandle beaches",
    ],
    authors: [{ name: "WhereTo30A" }],
    creator: "WhereTo30A",
    publisher: "WhereTo30A",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: siteUrl,
      siteName: "WhereTo30A",
      title: ogTitle,
      description: ogDescription,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: "WhereTo30A | Local Guide to 30A",
      description: ogDescription,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification: {
      // Add verification codes once Google/Bing Search Console supplies them (`metadata` merges with child routes)
      // google: "paste-tag-here",
    },
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/siteicon.png", type: "image/png" },
      ],
      apple: [{ url: "/siteicon.png", type: "image/png" }],
    },

  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = getSiteUrl();

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "WhereTo30A",
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/whereto30a.svg`,
    },
    sameAs: [] as string[],
    description:
      "Your complete local guide to 30A and Florida's Emerald Coast. Discover beach towns, restaurants, shops, events, and insider tips.",
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: "WhereTo30A",
    description: "Local guide to 30A and Florida's Emerald Coast",
    publisher: { "@id": `${siteUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: "en-US",
  };

  return (
    <html
      lang="en"
      className={`light ${inter.variable} ${manrope.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,0,0&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#F7F3EE" />
        <meta
          name="ahrefs-site-verification"
          content="4273df0f35318589bdf05e806ba5a1c57f13294109fdb9f0443f8463bf00c0fe"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var root = document.documentElement;
                  root.classList.remove('dark');
                  root.classList.add('light');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-background font-body text-on-surface">
        <ThemeProvider>
          <NavbarServer compact showSearch />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </ThemeProvider>
        <GoogleAnalytics />
        <Analytics />
        <AnalyticsClickCapture />
      </body>
    </html>
  );
}
