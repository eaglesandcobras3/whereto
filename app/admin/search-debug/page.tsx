"use server";

import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { runSearch } from "@/lib/search/run-search";
import type { SearchResultPayload } from "@/lib/search/types";
import SearchDebugClient from "./SearchDebugClient";

async function debugSearch(query: string): Promise<SearchResultPayload | null> {
  if (!query.trim()) return null;
  const result = await runSearch({
    rawQuery: query,
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    openaiKey: process.env.OPENAI_API_KEY,
    pageSize: 20,
    includeDebug: true,
  });
  return result;
}

export default async function SearchDebugPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  let result: SearchResultPayload | null = null;
  if (query) {
    result = await debugSearch(query);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <AdminPageHeader
        title="Search debug"
        description="Inspect hybrid search results, intent parsing, and ranking signals."
      />
      <div className="mt-6">
        <SearchDebugClient initialQuery={query} result={result} />
      </div>
    </div>
  );
}
