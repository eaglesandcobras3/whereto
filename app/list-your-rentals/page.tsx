import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListARentalForm } from "@/components/stays/ListARentalForm";
import { getAllFeatureFlags, isRentalsFeatureEnabled } from "@/lib/feature-flags";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";

export const metadata: Metadata = {
  title: "List a vacation rental | WhereTo30A",
  description:
    "Submit your 30A vacation rental for WhereTo30A. Guests discover your stay here, then check availability on your booking site.",
  ...canonicalAlternates("/list-your-rentals"),
  robots: { index: false, follow: false },
};

export default async function ListYourRentalsPage() {
  const flags = await getAllFeatureFlags();
  if (!isRentalsFeatureEnabled(flags)) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-headline text-3xl font-bold tracking-tight text-zinc-900">
        List a vacation rental
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        Add your stay to WhereTo30A. We publish an SEO-ready page and send guests to your booking
        engine to check availability — you keep reservations, payments, and guest support.
      </p>
      <p className="mt-2 text-sm text-zinc-600">
        Submissions are reviewed before they go live. A public company directory page is optional —{" "}
        <Link href="/list-your-business" className="font-medium text-teal-900 underline">
          list your business
        </Link>{" "}
        separately if you want one.
      </p>
      <div className="mt-8">
        <ListARentalForm />
      </div>
    </main>
  );
}
