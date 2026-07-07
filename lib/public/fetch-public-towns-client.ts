import type { PublicTownOption } from "@/lib/public/load-public-towns";

export async function fetchPublicTowns(signal?: AbortSignal): Promise<PublicTownOption[]> {
  const res = await fetch("/api/public/towns", { signal });
  if (!res.ok) {
    throw new Error(`Failed to load towns (${res.status})`);
  }
  const body = (await res.json()) as { towns?: PublicTownOption[] };
  return body.towns ?? [];
}
