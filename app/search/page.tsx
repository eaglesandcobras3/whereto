import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search redirect",
  description: "Legacy search URLs redirect to discover or the appropriate browse hub.",
  robots: { index: false, follow: false },
};

/** Legacy `/search` URLs are redirected in middleware; this is a static fallback. */
export default function SearchPage() {
  redirect("/");
}
