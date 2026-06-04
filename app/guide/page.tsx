import { permanentRedirect } from "next/navigation";
import { PRIMARY_EDITORIAL_GUIDE_PATH } from "@/lib/seo/sitemap-strategy";

/** Legacy `/guide` URL — canonical first-timer guide is a normal Supabase guide slug. */
export default function GuideHubRedirectPage() {
  permanentRedirect(PRIMARY_EDITORIAL_GUIDE_PATH);
}
