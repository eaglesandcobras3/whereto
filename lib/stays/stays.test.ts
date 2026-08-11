import { describe, expect, it } from "vitest";
import {
  buildPartnerBookingUrl,
  isBookingHostAllowed,
} from "@/lib/stays/booking-url";
import { isRentalIndexReady } from "@/lib/stays/eligibility";
import { parseIcalBusyDates } from "@/lib/stays/adapters/ical";
import { parseRentalSearchParams } from "@/lib/stays/search-params";
import { slugifyRentalTitle } from "@/lib/stays/slug";

describe("buildPartnerBookingUrl", () => {
  it("fills template placeholders", () => {
    const url = buildPartnerBookingUrl({
      template: "https://book.example.com/p/{external_id}?a={check_in}&d={check_out}&g={guests}",
      externalId: "ABC 1",
      checkIn: "2026-06-01",
      checkOut: "2026-06-08",
      guests: 4,
    });
    expect(url).toContain("book.example.com");
    expect(url).toContain("ABC%201");
    expect(url).toContain("2026-06-01");
    expect(url).toContain("4");
  });

  it("appends query params to property URL when no template", () => {
    const url = buildPartnerBookingUrl({
      bookingUrl: "https://pm.example.com/home/1",
      checkIn: "2026-06-01",
      checkOut: "2026-06-08",
      guests: 2,
    });
    expect(url).toContain("check_in=2026-06-01");
    expect(url).toContain("guests=2");
  });
});

describe("isBookingHostAllowed", () => {
  it("allows any host when allowlist empty", () => {
    expect(isBookingHostAllowed("https://foo.com/x", [])).toBe(true);
  });
  it("enforces allowlist", () => {
    expect(isBookingHostAllowed("https://book.pm.com/x", ["pm.com"])).toBe(true);
    expect(isBookingHostAllowed("https://evil.com/x", ["pm.com"])).toBe(false);
  });
});

describe("slugifyRentalTitle", () => {
  it("slugifies titles", () => {
    expect(slugifyRentalTitle("Ocean View!!", "EXT-9")).toMatch(/ocean-view/);
  });
});

describe("eligibility", () => {
  it("requires published active partner content", () => {
    expect(
      isRentalIndexReady({
        slug: "ocean-view",
        status: "published",
        partner_status: "active",
        description: "x".repeat(90),
        hero_image_url: "https://cdn.example.com/a.jpg",
        town_id: "00000000-0000-0000-0000-000000000001",
        bedrooms: 3,
        bathrooms: 2,
        sleeps: 6,
        booking_url: "https://book.example.com/1",
        content_rights_confirmed: true,
      }),
    ).toBe(true);

    expect(
      isRentalIndexReady({
        slug: "ocean-view",
        status: "draft",
        partner_status: "active",
        description: "x".repeat(90),
        hero_image_url: "https://cdn.example.com/a.jpg",
        town_id: "00000000-0000-0000-0000-000000000001",
        bedrooms: 3,
        bathrooms: 2,
        sleeps: 6,
        booking_url: "https://book.example.com/1",
        content_rights_confirmed: true,
      }),
    ).toBe(false);
  });
});

describe("ical", () => {
  it("parses busy dates with exclusive DTEND", () => {
    const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20260601
DTEND:20260603
END:VEVENT
END:VCALENDAR`;
    expect(parseIcalBusyDates(ical)).toEqual(["2026-06-01", "2026-06-02"]);
  });
});

describe("search params", () => {
  it("marks filtered searches", () => {
    const plan = parseRentalSearchParams({ town: "seaside", guests: "4" });
    expect(plan.hasFilters).toBe(true);
    expect(plan.townSlug).toBe("seaside");
    expect(plan.guests).toBe(4);
  });
});
