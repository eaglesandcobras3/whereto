import { createHash } from "crypto";

export function normalizeQuery(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s'-]/g, "");
}

export function hashQuery(normalized: string): string {
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
