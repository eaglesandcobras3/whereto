import { NextRequest, NextResponse } from "next/server";
import { isValidPlacePhotoName } from "@/lib/media/place-photo";

/**
 * Streams a Places photo with the server key. Cached at the edge for listing grids.
 */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name || !isValidPlacePhotoName(name)) {
    return new NextResponse("Invalid photo reference", { status: 400 });
  }

  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) {
    return new NextResponse("Photo service unavailable", { status: 503 });
  }

  const url = `https://places.googleapis.com/v1/${encodeURIComponent(name)}/media?maxHeightPx=800&maxWidthPx=1200`;
  const upstream = await fetch(url, {
    headers: { "X-Goog-Api-Key": key },
    next: { revalidate: 86400 },
  });

  if (!upstream.ok) {
    return new NextResponse("Photo not found", { status: upstream.status === 404 ? 404 : 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  const body = upstream.body;
  if (!body) {
    return new NextResponse("Empty response", { status: 502 });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
