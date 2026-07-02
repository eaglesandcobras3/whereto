import type { DiscoveryFilterState } from "@/lib/discovery-filters/filter-state";

export type FilterContractViolation = {
  code: string;
  message: string;
};

export function validateFilterContract(state: DiscoveryFilterState): FilterContractViolation[] {
  const errors: FilterContractViolation[] = [];

  if (state.entity_type === "storefront" && state.service_category_slug) {
    errors.push({
      code: "service_category_on_storefront",
      message: "service_category applies only to service listings",
    });
  }

  if (state.entity_type === "service" && state.category_slug) {
    errors.push({
      code: "category_on_service",
      message: "category applies only to storefront listings",
    });
  }

  if (state.category_slug && state.service_category_slug) {
    errors.push({
      code: "category_and_service_category",
      message: "Use category or service_category, not both",
    });
  }

  return errors;
}
