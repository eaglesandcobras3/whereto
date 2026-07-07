import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { loadPublicTowns } from "@/lib/public/load-public-towns";

export const revalidate = 21600;

const getCachedPublicTowns = unstable_cache(
  loadPublicTowns,
  ["public-towns"],
  { revalidate: 21600 },
);

export async function GET() {
  const towns = await getCachedPublicTowns();
  return NextResponse.json({ towns });
}
