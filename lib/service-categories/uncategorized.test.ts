import { describe, expect, it } from "vitest";
import {
  isServiceUncategorizedSection,
  SERVICE_UNCATEGORIZED_PUBLIC_SEGMENT,
  SERVICE_UNCATEGORIZED_SECTION_ID,
  SERVICE_UNCATEGORIZED_TITLE,
  serviceUncategorizedHubPath,
} from "@/lib/service-categories/uncategorized";

describe("service uncategorized bucket", () => {
  it("exposes a stable public path under /services", () => {
    expect(serviceUncategorizedHubPath()).toBe("/services/uncategorized");
    expect(SERVICE_UNCATEGORIZED_PUBLIC_SEGMENT).toBe("uncategorized");
    expect(SERVICE_UNCATEGORIZED_SECTION_ID).toBe("__uncategorized__");
    expect(SERVICE_UNCATEGORIZED_TITLE).toBe("Other");
  });

  it("recognizes hub section id and public segment", () => {
    expect(isServiceUncategorizedSection(SERVICE_UNCATEGORIZED_SECTION_ID)).toBe(true);
    expect(isServiceUncategorizedSection(SERVICE_UNCATEGORIZED_PUBLIC_SEGMENT)).toBe(true);
    expect(isServiceUncategorizedSection("professional")).toBe(false);
  });
});
