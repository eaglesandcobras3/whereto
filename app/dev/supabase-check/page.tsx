import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  buildSupabaseEnvStep,
  normalizeOptionalSlug,
  runSupabaseDataSteps,
} from "@/lib/diagnostics/supabase-steps";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ town?: string; business?: string }>;
};

function allowed(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.ENABLE_SUPABASE_DIAG_UI === "1";
}

export default async function SupabaseCheckPage({ searchParams }: Props) {
  if (!allowed()) notFound();

  const { town, business } = await searchParams;
  const townSlug = normalizeOptionalSlug(town);
  const businessSlug = normalizeOptionalSlug(business);

  const step1 = buildSupabaseEnvStep();
  let rest: Awaited<ReturnType<typeof runSupabaseDataSteps>> = [];
  if (step1.ok) {
    try {
      const supabase = getServiceSupabase();
      rest = await runSupabaseDataSteps(supabase, { townSlug, businessSlug });
    } catch (e) {
      rest = [
        {
          n: 2,
          title: "Service client",
          ok: false,
          detail: e instanceof Error ? e.message : String(e),
        },
      ];
    }
  }
  const steps = [step1, ...rest];

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
          Local diagnostics
        </p>
        <h1 className="mt-1 font-headline text-2xl font-bold tracking-tight">Supabase (step by step)</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Fix the first <strong className="font-semibold text-[var(--color-text-primary)]">Fail</strong> before
          moving on. In production, this URL is off unless <code className="text-xs">ENABLE_SUPABASE_DIAG_UI=1</code>.
        </p>

        <form className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end" action="/dev/supabase-check" method="get">
          <label className="block min-w-0 flex-1 text-sm">
            <span className="mb-1 block text-[var(--color-text-tertiary)]">Town slug (optional)</span>
            <input
              name="town"
              defaultValue={townSlug ?? ""}
              placeholder="e.g. rosemary-beach"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block min-w-0 flex-1 text-sm">
            <span className="mb-1 block text-[var(--color-text-tertiary)]">Business slug (optional)</span>
            <input
              name="business"
              defaultValue={businessSlug ?? ""}
              placeholder="e.g. my-place-slug"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Run checks
          </button>
        </form>

        <p className="mt-3 text-xs text-[var(--color-text-tertiary)]">
          CLI: <code className="rounded bg-[var(--color-surface-container-high)] px-1">pnpm run diagnose:supabase</code>
        </p>

        <ol className="mt-10 space-y-3">
          {steps.map((s) => (
            <li
              key={s.n}
              className={`rounded-xl border p-4 ${
                s.ok
                  ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30"
                  : "border-rose-200 bg-rose-50/80 dark:border-rose-800 dark:bg-rose-950/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-sm font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">
                    {s.n}
                  </span>
                  <span className="font-semibold leading-tight text-zinc-900 dark:text-zinc-100">{s.title}</span>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold uppercase ${
                    s.ok ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                  }`}
                >
                  {s.ok ? "OK" : "Fail"}
                </span>
              </div>
              <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                {s.detail}
              </pre>
            </li>
          ))}
        </ol>

        <div className="mt-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-secondary)]">
          <p className="font-medium text-[var(--color-text-primary)]">After all steps pass</p>
          <ul className="mt-2 list-inside list-decimal space-y-1">
            <li>
              Town hub: <Link className="text-[var(--color-primary)] hover:underline" href="/">home</Link> then your{" "}
              <code className="text-xs">/{`{slug}`}</code>
            </li>
            <li>
              Area: <code className="text-xs">/area/{"{slug}"}</code>
            </li>
            <li>
              Business: <code className="text-xs">/business/{"{slug}"}</code>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
