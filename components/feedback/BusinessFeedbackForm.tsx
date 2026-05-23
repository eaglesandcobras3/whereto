"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
const labelClass = "block text-sm font-medium text-[var(--color-text-secondary)]";

export function BusinessFeedbackForm() {
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    setErr(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      _hp_website_field: String(fd.get("_hp_website_field") ?? ""),
      submitter_name: String(fd.get("submitter_name") ?? ""),
      submitter_email: String(fd.get("submitter_email") ?? ""),
      listing_context: String(fd.get("listing_context") ?? ""),
      message: String(fd.get("message") ?? ""),
    };

    const res = await fetch("/api/business-feedback", {
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
      setMsg("Thanks — we received your feedback. Our team reads every note.");
      e.currentTarget.reset();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="_hp_website_field_website">Website</label>
        <input id="_hp_website_field_website" name="_hp_website_field" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="feedback_name">
            Your name
          </label>
          <input id="feedback_name" name="submitter_name" required maxLength={120} className={`${inputClass} mt-1.5`} />
        </div>
        <div>
          <label className={labelClass} htmlFor="feedback_email">
            Your email
          </label>
          <input
            id="feedback_email"
            name="submitter_email"
            type="email"
            required
            autoComplete="email"
            maxLength={320}
            className={`${inputClass} mt-1.5`}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="listing_context">
          Listing link or business name{" "}
          <span className="font-normal text-[var(--color-text-tertiary)]">(optional)</span>
        </label>
        <input
          id="listing_context"
          name="listing_context"
          maxLength={500}
          placeholder="e.g. https://whereto30a.com/business/your-place or restaurant name"
          className={`${inputClass} mt-1.5`}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="message">
          Your feedback
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={15}
          maxLength={4000}
          rows={6}
          className={`${inputClass} mt-1.5`}
          placeholder="What happened? Was something wrong or outdated?"
        />
      </div>

      {err ? (
        <p className="text-sm text-red-600" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="text-sm text-green-700" role="status">
          {msg}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
