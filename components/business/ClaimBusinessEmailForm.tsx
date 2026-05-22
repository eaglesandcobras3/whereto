"use client";

import { useState } from "react";

type Props = {
  /** Current public slug (`/business/[slug]`). */
  businessSlug: string;
  businessTitle: string;
  /** Lighter styling when disclosed under main narrative (sidebar card uses default). */
  embedded?: boolean;
};

const inputClass =
  "w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
const labelClass = "block text-xs font-medium text-[var(--color-text-secondary)]";

export function ClaimBusinessEmailForm({ businessSlug, businessTitle, embedded = false }: Props) {
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const outerClass = embedded
    ? "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 p-5 sm:p-6"
    : "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm";
  const headingClass = embedded
    ? "font-headline text-base font-semibold text-zinc-900"
    : "font-headline text-base font-bold text-zinc-900";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErr(null);

    const fd = new FormData(e.currentTarget);

    const payload = {
      _hp_company_phone: String(fd.get("_hp_company_phone") ?? ""),
      business_slug: businessSlug,
      submitter_name: String(fd.get("submitter_name") ?? ""),
      submitter_email: String(fd.get("submitter_email") ?? ""),
      submitter_phone: String(fd.get("submitter_phone") ?? ""),
      relationship: String(fd.get("relationship") ?? ""),
      changes_requested: String(fd.get("changes_requested") ?? ""),
    };

    const res = await fetch("/api/business-claim-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = (await res.json()) as {
      ok?: boolean;
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };
    setPending(false);

    if (!res.ok) {
      if (j.fieldErrors) {
        const first = Object.values(j.fieldErrors).flat()[0];
        setErr(first ?? j.error ?? "Something went wrong.");
      } else {
        setErr(j.error ?? "Something went wrong.");
      }
      return;
    }

    if (j.ok) {
      setDone(true);
      e.currentTarget.reset();
    }
  }

  if (done) {
    return (
      <div className={outerClass}>
        <h2 className={headingClass}>Thanks — message sent</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
          We routed your note to our team by email for <span className="font-medium">{businessTitle}</span>. If you
          typed your email correctly, we can reply from there once we&apos;ve reviewed it.
        </p>
        <button
          type="button"
          className="mt-4 text-sm font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline"
          onClick={() => setDone(false)}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${outerClass}`}>
      <h2 className={headingClass}>Claim or update listing</h2>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
        Owners and authorized contacts: tell us what&apos;s wrong or what should change. We review manually—no automated
        verification from this form.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
          <label htmlFor="_hp_company_phone">Company phone</label>
          <input id="_hp_company_phone" name="_hp_company_phone" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor={`claim-name-${businessSlug}`}>
              Your name
            </label>
            <input
              id={`claim-name-${businessSlug}`}
              name="submitter_name"
              required
              autoComplete="name"
              className={`${inputClass} mt-1`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`claim-email-${businessSlug}`}>
              Your email
            </label>
            <input
              id={`claim-email-${businessSlug}`}
              name="submitter_email"
              type="email"
              required
              autoComplete="email"
              className={`${inputClass} mt-1`}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor={`claim-phone-${businessSlug}`}>
            Your phone <span className="font-normal text-[var(--color-text-tertiary)]">(optional)</span>
          </label>
          <input id={`claim-phone-${businessSlug}`} name="submitter_phone" type="tel" autoComplete="tel" className={`${inputClass} mt-1`} />
        </div>

        <div>
          <label className={labelClass} htmlFor={`claim-role-${businessSlug}`}>
            Your role{" "}
            <span className="font-normal text-[var(--color-text-tertiary)]">(optional)</span>
          </label>
          <input
            id={`claim-role-${businessSlug}`}
            name="relationship"
            className={`${inputClass} mt-1`}
            placeholder="Owner, GM, marketer, authorized rep …"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor={`claim-changes-${businessSlug}`}>
            What should we change?
          </label>
          <textarea
            id={`claim-changes-${businessSlug}`}
            name="changes_requested"
            required
            rows={4}
            minLength={15}
            placeholder="Examples: corrected hours or phone number, outdated description, closure, wrong photo, spelling of the business name…"
            className={`${inputClass} mt-1`}
          />
          <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">At least 15 characters.</p>
        </div>

        {err ? (
          <p className="text-sm text-red-700 dark:text-red-300" role="alert">
            {err}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-logo-navy)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Email our team"}
        </button>
      </form>
    </div>
  );
}
