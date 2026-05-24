"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setStatus("sent");
      setMessage("Check your email for the reset link.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not send reset email");
    }
  }

  if (status === "sent") {
    return (
      <div className="mt-6">
        <p className="text-sm text-zinc-600">{message}</p>
        <Link
          href="/login"
          {...gaClickProps({ event: "nav_click", category: "auth_forgot", label: "back_to_login_success" })}
          className="mt-4 block text-sm text-teal-700 hover:underline"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          {...gaClickProps({ event: "cta_click", category: "auth_forgot", label: "submit" })}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {status === "loading" ? "Sending..." : "Send reset link"}
        </button>
      </form>
      {message ? (
        <p className="mt-4 text-sm text-red-600">{message}</p>
      ) : null}
      <Link
        href="/login"
        {...gaClickProps({ event: "nav_click", category: "auth_forgot", label: "back_to_login" })}
        className="mt-4 text-sm text-teal-700 hover:underline"
      >
        ← Back to sign in
      </Link>
    </>
  );
}
