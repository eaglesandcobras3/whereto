import { permanentRedirect, redirect } from "next/navigation";
import { getAllFeatureFlags, isGuidesEnabled } from "@/lib/feature-flags";
import { PRIMARY_EDITORIAL_GUIDE_PATH } from "@/lib/seo/sitemap-strategy";

/** Legacy `/guide` URL — canonical first-timer guide is a normal Supabase guide slug. */
export default async function GuideHubRedirectPage() {
  const flags = await getAllFeatureFlags();
  if (!isGuidesEnabled(flags)) redirect("/");
  permanentRedirect(PRIMARY_EDITORIAL_GUIDE_PATH);
}
