import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListYourRentalsForm } from "@/components/stays/ListYourRentalsForm";
import { getAllFeatureFlags, isRentalsFeatureEnabled } from "@/lib/feature-flags";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";

export const metadata: Metadata = {
  title: "Rental partner application | WhereTo30A",
  description:
    "Apply as a WhereTo30A rental partner without submitting a specific property yet.",
  ...canonicalAlternates("/list-your-rentals/partner"),
  robots: { index: false, follow: false },
};

export default async function ListYourRentalsPartnerPage() {
  const flags = await getAllFeatureFlags();
  if (!isRentalsFeatureEnabled(flags)) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <p className="text-sm text-zinc-600">
        <Link href="/list-your-rentals" className="font-medium text-teal-900 underline">
          ← List a vacation rental
        </Link>
      </p>
      <h1 className="mt-4 font-headline text-3xl font-bold tracking-tight text-zinc-900">
        Partner application
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        Company-level partnership without a specific home yet. To submit a stay for review, use{" "}
        <Link href="/list-your-rentals" className="font-medium text-teal-900 underline">
          list a vacation rental
        </Link>
        .
      </p>
      <div className="mt-8">
        <ListYourRentalsForm />
      </div>
    </main>
  );
}
