export type RankScoreConfig = {
  apiBase: string;
  apiKey: string;
};

export function getRankScoreConfig(): RankScoreConfig | null {
  const apiBase = process.env.RANKSCORE_API_BASE?.trim().replace(/\/$/, "");
  const apiKey = process.env.RANKSCORE_API_KEY?.trim();
  if (!apiBase || !apiKey) return null;
  return { apiBase, apiKey };
}

export function requireRankScoreConfig(): RankScoreConfig {
  const config = getRankScoreConfig();
  if (!config) {
    throw new Error(
      "Missing RANKSCORE_API_BASE or RANKSCORE_API_KEY (set both in .env.local or Vercel env).",
    );
  }
  return config;
}
