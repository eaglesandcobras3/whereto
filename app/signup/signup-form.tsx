"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import posthog from "posthog-js";
import { signUpAction } from "@/lib/auth/actions";
import { identifyPostHogUserAndWaitForFlags } from "@/lib/analytics/posthog-auth";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

function resolveNextPath(raw: string | null | undefined, fallback: string): string {
  const candidate = raw?.trim();
  if (candidate && candidate.startsWith("/") && !candidate.startsWith("//")) {
    return candidate;
  }
  return fallback;
}

export function SignupForm({ nextPath = "/profile" }: { nextPath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [attributionCity, setAttributionCity] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const resolvedNextPath = resolveNextPath(
    searchParams.get("next"),
    nextPath,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setStatus("error");
      setMessage("Password must be at least 6 characters");
      return;
    }

    if (!attributionCity.trim()) {
      setStatus("error");
      setMessage("Enter the city you’re from");
      return;
    }

    try {
      const result = await signUpAction(email, password, attributionCity);
      if (!result.ok) throw new Error(result.error);
      if (result.user) {
        await identifyPostHogUserAndWaitForFlags(result.user);
      }
      posthog.capture("user_signed_up", { method: "email" });
      const next = resolveNextPath(resolvedNextPath, "/profile");
      router.push(next);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create account";
      setStatus("error");
      setMessage(message);
      posthog.capture("user_sign_up_failed", { error_message: message });
    }
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
        <input
          type="text"
          required
          value={attributionCity}
          onChange={(e) => setAttributionCity(e.target.value)}
          placeholder="City you’re from (e.g. Birmingham)"
          maxLength={80}
          autoComplete="address-level2"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        <p className="-mt-1 text-xs text-zinc-500">
          Used for semi-anonymous tips like “Someone from Birmingham said…” — not shown as your name.
        </p>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        <input
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          {...gaClickProps({ event: "cta_click", category: "auth_signup", label: "submit" })}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {status === "loading" ? "Creating account..." : "Create account"}
        </button>
      </form>
      {message ? (
        <p className="mt-4 text-sm text-red-600">{message}</p>
      ) : null}
      <p className="mt-4 text-sm text-zinc-600">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(resolvedNextPath)}`}
          {...gaClickProps({ event: "nav_click", category: "auth_signup", label: "login_redirect" })}
          className="text-teal-700 hover:underline"
        >
          Sign in
        </Link>
      </p>
      <Link
        href="/"
        {...gaClickProps({ event: "nav_click", category: "auth_signup", label: "back_to_search" })}
        className="mt-4 text-sm text-teal-700 hover:underline"
      >
        ← Back to home
      </Link>
    </>
  );
}
