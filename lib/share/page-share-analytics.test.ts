import { describe, expect, it } from "vitest";
import {
  buildShareEventProperties,
  getDeviceType,
} from "@/lib/share/page-share-analytics";

describe("getDeviceType", () => {
  it("detects mobile user agents", () => {
    expect(getDeviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(
      "mobile",
    );
  });

  it("detects tablet user agents", () => {
    expect(getDeviceType("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet");
  });

  it("defaults to desktop", () => {
    expect(getDeviceType("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)")).toBe("desktop");
  });
});

describe("buildShareEventProperties", () => {
  it("includes page identity without share_method by default", () => {
    const props = buildShareEventProperties({
      pageType: "town",
      pageId: "town-1",
      pageTitle: "Seaside",
      pageSlug: "seaside",
      pageUrl: "https://whereto30a.com/town/seaside",
    });

    expect(props.page_type).toBe("town");
    expect(props.page_id).toBe("town-1");
    expect(props.page_title).toBe("Seaside");
    expect(props.page_slug).toBe("seaside");
    expect(props.page_url).toBe("https://whereto30a.com/town/seaside");
    expect(props.device_type).toBe("desktop");
    expect(props.share_method).toBeUndefined();
  });

  it("adds share_method when provided", () => {
    const props = buildShareEventProperties(
      {
        pageType: "guide",
        pageId: null,
        pageTitle: "First Timer",
        pageSlug: "first-timer",
        pageUrl: "https://whereto30a.com/guide/first-timer",
      },
      "copy_link",
    );
    expect(props.share_method).toBe("copy_link");
  });
});
