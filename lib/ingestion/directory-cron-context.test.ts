import { describe, expect, it } from "vitest";
import {
  assertDirectoryIngestionCronContext,
  withDirectoryIngestionCronContext,
} from "./directory-cron-context";

describe("directory-cron-context", () => {
  it("throws outside cron wrapper", () => {
    expect(() => assertDirectoryIngestionCronContext()).toThrow(
      /Directory ingestion API is restricted/,
    );
  });

  it("allows assert inside withDirectoryIngestionCronContext", async () => {
    await withDirectoryIngestionCronContext(async () => {
      expect(() => assertDirectoryIngestionCronContext()).not.toThrow();
    });
  });
});
