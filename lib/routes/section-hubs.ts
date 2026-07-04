import { redirect } from "next/navigation";

export const SECTION_HUB_PATHS = {
  guides: "/guides",
  areas: "/areas",
  towns: "/towns",
} as const;

export type SectionHub = keyof typeof SECTION_HUB_PATHS;

/** Redirect to the listing hub when a detail slug no longer exists. */
export function redirectToSectionHub(section: SectionHub): never {
  redirect(SECTION_HUB_PATHS[section]);
}
