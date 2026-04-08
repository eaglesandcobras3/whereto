/**
 * Listing hero images are first-party or explicitly licensed (`business_images`).
 * Third-party map API photos are not synced. Use admin upload flows or Storage writes instead.
 */
export async function runSyncBusinessHeroImagesBatch(_budget: number) {
  return {
    processed: 0,
    message:
      "Third-party map photo sync disabled — set hero_image_url from owner/licensed sources only",
  };
}
