import type { Metadata } from "next";
import Link from "next/link";

/** Confirms the `/verify` path works; town checks use the API route (see copy below). */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function VerifyIndexPage() {
  const example = "/api/debug/town/rosemary-beach";
  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-zinc-100">
      <h1 className="font-mono text-lg">Debug</h1>
      <p className="mt-4 max-w-lg text-sm text-zinc-400">
        The HTML page at <code className="text-zinc-300">/verify/town/[slug]</code> was unreliable in
        the App Router. Use the API instead:
      </p>
      <p className="mt-4 font-mono text-sm text-emerald-400">
        <Link href={example} className="underline">
          {example}
        </Link>
      </p>
      <p className="mt-6 text-xs text-zinc-500">Open the link above or paste it in the address bar. You should see JSON.</p>
    </div>
  );
}
