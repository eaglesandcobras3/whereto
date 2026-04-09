"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const next = nextPath.startsWith("/") ? nextPath : "/";
      router.push(next);
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not sign in");
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
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {status === "loading" ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {message ? (
        <p className="mt-4 text-sm text-red-600">{message}</p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 text-sm">
        <Link href="/forgot-password" className="text-teal-700 hover:underline">
          Forgot password?
        </Link>
        <p className="text-zinc-600">
          Don&apos;t have an account?{" "}
          <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="text-teal-700 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
      <Link href="/" className="mt-4 text-sm text-teal-700 hover:underline">
        ← Back to search
      </Link>
    </>
  );
}
