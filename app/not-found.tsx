import Link from "next/link";
import { Suspense } from "react";
import { PostHogNotFoundCapture } from "@/components/analytics/PostHogNotFoundCapture";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-5 py-16 text-center">
      <Suspense fallback={null}>
        <PostHogNotFoundCapture />
      </Suspense>

      <p className="text-eyebrow mb-3">404</p>
      <h1 className="text-editorial-headline text-3xl text-[var(--color-text-primary)] sm:text-4xl">
        Page not found
      </h1>
      <p className="prose-editorial mt-4 max-w-md text-[var(--color-text-secondary)]">
        That link may be outdated or the page was moved. Try one of the hubs below or head home.
      </p>

      <nav className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          {...gaClickProps({ event: "nav_click", category: "not_found", label: "home" })}
          className="rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Home
        </Link>
        <Link
          href="/towns"
          {...gaClickProps({ event: "nav_click", category: "not_found", label: "towns" })}
          className="rounded-full border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]"
        >
          Towns
        </Link>
        <Link
          href="/areas"
          {...gaClickProps({ event: "nav_click", category: "not_found", label: "areas" })}
          className="rounded-full border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]"
        >
          Areas
        </Link>
        <Link
          href="/guides"
          {...gaClickProps({ event: "nav_click", category: "not_found", label: "guides" })}
          className="rounded-full border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]"
        >
          Guides
        </Link>
      </nav>
    </div>
  );
}
