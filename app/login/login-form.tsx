"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import posthog from "posthog-js";
import { signInWithPasswordAction } from "@/lib/auth/actions";
import { identifyPostHogUserAndWaitForFlags } from "@/lib/analytics/posthog-auth";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export function LoginForm({ nextPath = "/profile" }: { nextPath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const resolvedNextPath = safeNextPath(
    searchParams.get("next"),
    nextPath,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const result = await signInWithPasswordAction(email, password);
      if (!result.ok) throw new Error(result.error);
      if (result.user) {
        await identifyPostHogUserAndWaitForFlags(result.user);
      }
      posthog.capture("user_signed_in", { method: "email" });
      const next = safeNextPath(resolvedNextPath, "/profile");
      router.push(next);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sign in";
      setStatus("error");
      setMessage(message);
      posthog.capture("user_sign_in_failed", { error_message: message });
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
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          {...gaClickProps({ event: "cta_click", category: "auth_login", label: "submit" })}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {status === "loading" ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {message ? (
        <p className="mt-4 text-sm text-red-600">{message}</p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 text-sm">
        <Link
          href="/forgot-password"
          {...gaClickProps({ event: "nav_click", category: "auth_login", label: "forgot_password" })}
          className="text-teal-700 hover:underline"
        >
          Forgot password?
        </Link>
        <p className="text-zinc-600">
          Don&apos;t have an account?{" "}
          <Link
            href={`/signup?next=${encodeURIComponent(resolvedNextPath)}`}
            {...gaClickProps({ event: "nav_click", category: "auth_login", label: "signup_redirect" })}
            className="text-teal-700 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
      <Link
        href="/"
        {...gaClickProps({ event: "nav_click", category: "auth_login", label: "back_to_search" })}
        className="mt-4 text-sm text-teal-700 hover:underline"
      >
        ← Back to home
      </Link>
    </>
  );
}
