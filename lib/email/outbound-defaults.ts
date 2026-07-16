/** Default transactional From when LISTING_NOTIFICATION_FROM_EMAIL / RESEND_FROM_EMAIL omitted.
 * Apex domain must remain verified for this address in Resend (matches design-agency fallback pattern). */
export const OUTBOUND_CONTACT_FROM_DEFAULT = "contact@whereto30a.com";

export function formatFromAddress(
  raw: string | undefined | null,
  displayName = "WhereTo30A",
): string {
  const address = raw?.trim() || OUTBOUND_CONTACT_FROM_DEFAULT;
  return address.includes("<") ? address : `${displayName} <${address}>`;
}
