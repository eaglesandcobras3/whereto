import type { DiscoveryEntityType } from "@/lib/discovery-filters/filter-state";

/** Regional services are corridor-wide — never constrained by town. */
export function discoverTownFilterApplies(entityType: DiscoveryEntityType): boolean {
  return entityType !== "service";
}
