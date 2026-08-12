import { describe, expect, it } from "vitest";
import {
  buildPartnerBookingUrl,
  isBookingHostAllowed,
} from "@/lib/stays/booking-url";
import { isRentalIndexReady } from "@/lib/stays/eligibility";
import { parseIcalBusyDates } from "@/lib/stays/adapters/ical";
import { rentalListingSubmissionSchema } from "@/lib/stays/listing-submission-schema";
import { rentalPartnerApplicationSchema } from "@/lib/stays/partner-application-schema";
import { parseRentalSearchParams } from "@/lib/stays/search-params";
import { generateVacationRentalSchema } from "@/lib/stays/seo";
import { slugifyRentalTitle } from "@/lib/stays/slug";
import type { RentalPropertyView } from "@/lib/stays/types";

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

describe("listing submission schema", () => {
  const base = {
    display_name: "Gulf Homes PM",
    contact_name: "Alex Manager",
    contact_email: "alex@example.com",
    title: "Ocean Cottage",
    description: "A calm three-bedroom stay a short walk from the beach with a porch.",
    town_id: "11111111-1111-4111-8111-111111111111",
    bedrooms: 3,
    bathrooms: 2,
    sleeps: 6,
    booking_url: "https://book.example.com/ocean",
    authority_attested: true,
    content_rights_attested: true,
  };

  it("accepts a complete public listing submission", () => {
    const parsed = rentalListingSubmissionSchema.safeParse({
      ...base,
      community_name: "Seagrove",
      street_address: "123 Coastal Hwy",
      postal_code: "32459",
      location_precision: "approximate",
    });
    expect(parsed.success).toBe(true);
  });

  it("requires booking url and description", () => {
    expect(
      rentalListingSubmissionSchema.safeParse({ ...base, booking_url: "" }).success,
    ).toBe(false);
    expect(
      rentalListingSubmissionSchema.safeParse({ ...base, description: "too short" }).success,
    ).toBe(false);
  });
});

describe("partner application schema", () => {
  const base = {
    display_name: "Gulf Homes PM",
    contact_name: "Alex Manager",
    contact_email: "alex@example.com",
    authority_attested: true,
    content_rights_attested: true,
  };

  it("allows apply without a public business link", () => {
    const parsed = rentalPartnerApplicationSchema.safeParse({
      ...base,
      link_public_business: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("requires business slug or id when linking a public profile", () => {
    const parsed = rentalPartnerApplicationSchema.safeParse({
      ...base,
      link_public_business: true,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("vacation rental schema provider", () => {
  const property = {
    title: "Ocean Cottage",
    description: "A calm stay near the beach.",
    excerpt: null,
    bedrooms: 3,
    sleeps: 6,
    town_title: "Seaside",
    hero_image_url: null,
    primary_image_url: null,
    pricing_reliable: false,
    starting_nightly_rate: null,
    currency: "USD",
    business_title: "Public Co",
    business_website: "https://public.example.com",
    partner_display_name: "Ops Brand",
    partner_show_public_business_profile: false,
  } as unknown as RentalPropertyView;

  it("uses partner display name when public business is off", () => {
    const schema = generateVacationRentalSchema(property, "https://example.com/stays/ocean");
    expect(schema.provider).toEqual({
      "@type": "Organization",
      name: "Ops Brand",
      url: undefined,
    });
  });

  it("uses business title when public business is on", () => {
    const schema = generateVacationRentalSchema(
      { ...property, partner_show_public_business_profile: true },
      "https://example.com/stays/ocean",
    );
    expect(schema.provider).toEqual({
      "@type": "Organization",
      name: "Public Co",
      url: "https://public.example.com",
    });
  });
});
