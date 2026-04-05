import { describe, expect, it } from "vitest";
import { htmlToPlainText, redactForMining } from "./sanitize";

describe("htmlToPlainText", () => {
  it("strips tags and scripts", () => {
    const html = `<div><script>evil()</script><p>Hello <b>30A</b></p></div>`;
    expect(htmlToPlainText(html)).toContain("Hello");
    expect(htmlToPlainText(html)).not.toContain("script");
    expect(htmlToPlainText(html)).not.toContain("evil");
  });
});

describe("redactForMining", () => {
  it("removes emails and phones", () => {
    const t = "contact me at user@example.com or 850-555-1234 for yoga";
    const r = redactForMining(t);
    expect(r).not.toContain("example.com");
    expect(r).not.toContain("850");
    expect(r).toContain("yoga");
  });

  it("removes long quotes", () => {
    const long = "x".repeat(90);
    const t = `said "${long}" about brunch`;
    const r = redactForMining(t);
    expect(r.length).toBeLessThan(t.length);
  });
});
