import OpenAI from "openai";

const EMBED_MODEL = "text-embedding-3-small";
const EMBED_DIMS = 1536;

export type BusinessEmbeddingSource = {
  title: string | null;
  excerpt: string | null;
  business_type: string | null;
  search_profile: string | null;
  embedding_summary: string | null;
  search_terms: string | null;
  item_tags?: string[] | null;
};

/** Text embedded for hybrid search — prefers search_profile, then derived summary. */
export function businessEmbeddingInput(row: BusinessEmbeddingSource): string {
  const profile = row.search_profile?.trim();
  if (profile) return profile.slice(0, 8000);

  const summary = row.embedding_summary?.trim();
  if (summary) return summary.slice(0, 8000);

  const parts = [
    row.title,
    row.business_type,
    row.excerpt,
    row.search_terms,
    (row.item_tags ?? []).slice(0, 8).join(" "),
  ].filter(Boolean) as string[];

  return parts.join(". ").slice(0, 8000);
}

export async function embedBusinessText(
  text: string,
  openaiKey: string,
): Promise<number[] | null> {
  const input = text.trim();
  if (!input) return null;

  const openai = new OpenAI({ apiKey: openaiKey });
  const res = await openai.embeddings.create({
    model: EMBED_MODEL,
    input,
    dimensions: EMBED_DIMS,
  });
  return res.data[0]?.embedding ?? null;
}

export function embeddingToPgvector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
