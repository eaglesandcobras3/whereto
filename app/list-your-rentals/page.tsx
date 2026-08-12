import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListYourRentalsForm } from "@/components/stays/ListYourRentalsForm";
import { getAllFeatureFlags, isRentalsFeatureEnabled } from "@/lib/feature-flags";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";

export const metadata: Metadata = {
  title: "List your rentals | Partner with WhereTo30A",
  description:
    "Partner with WhereTo30A to publish vacation rentals and send guests to your direct booking engine.",
  ...canonicalAlternates("/list-your-rentals"),
  robots: { index: false, follow: false },
};

export default async function ListYourRentalsPage() {
  const flags = await getAllFeatureFlags();
  if (!isRentalsFeatureEnabled(flags)) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-headline text-3xl font-bold tracking-tight text-zinc-900">
        Partner with WhereTo30A
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        Publish SEO-ready stay pages and send visitors to your existing booking engine. We handle
        discovery and referral tracking — you keep reservations, payments, and guest support.
      </p>
      <p className="mt-2 text-sm text-zinc-600">
        A public property-management company page is optional. You can partner with stay listings
        only, or also{" "}
        <Link href="/list-your-business" className="font-medium text-teal-900 underline">
          list your business
        </Link>{" "}
        if you want a company profile.
      </p>
      <div className="mt-8">
        <ListYourRentalsForm />
      </div>
    </main>
  );
}
