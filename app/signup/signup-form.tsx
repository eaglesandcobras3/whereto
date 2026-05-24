"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

export function SignupForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

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

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      const next = nextPath.startsWith("/") ? nextPath : "/profile";
      router.push(next);
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not create account");
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
          href={`/login?next=${encodeURIComponent(nextPath)}`}
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
        ← Back to search
      </Link>
    </>
  );
}
