import { z } from "zod";
import { RENTAL_BEACH_ACCESS, RENTAL_PROPERTY_TYPES } from "@/lib/stays/types";

export const rentalSearchParamsSchema = z.object({
  town: z.string().trim().max(120).optional(),
  town_id: z.string().uuid().optional(),
  area: z.string().trim().max(120).optional(),
  area_id: z.string().uuid().optional(),
  check_in: z.string().trim().max(32).optional(),
  check_out: z.string().trim().max(32).optional(),
  guests: z.coerce.number().int().min(1).max(50).optional(),
  bedrooms: z.coerce.number().min(0).max(20).optional(),
  bathrooms: z.coerce.number().min(0).max(20).optional(),
  type: z.enum(RENTAL_PROPERTY_TYPES).optional(),
  pets: z
    .union([z.literal("1"), z.literal("true"), z.literal("yes")])
    .optional()
    .transform((v) => (v ? true : undefined)),
  pool: z
    .union([z.literal("1"), z.literal("true"), z.literal("yes")])
    .optional()
    .transform((v) => (v ? true : undefined)),
  gulf_front: z
    .union([z.literal("1"), z.literal("true"), z.literal("yes")])
    .optional()
    .transform((v) => (v ? true : undefined)),
  gulf_view: z
    .union([z.literal("1"), z.literal("true"), z.literal("yes")])
    .optional()
    .transform((v) => (v ? true : undefined)),
  beach: z.enum(RENTAL_BEACH_ACCESS).optional(),
  golf_cart: z
    .union([z.literal("1"), z.literal("true"), z.literal("yes")])
    .optional()
    .transform((v) => (v ? true : undefined)),
  page: z.coerce.number().int().min(1).max(200).optional().default(1),
  q: z.string().trim().max(200).optional(),
});

export type RentalSearchParams = z.infer<typeof rentalSearchParamsSchema>;

export type RentalSearchPlan = {
  townSlug?: string;
  townId?: string;
  areaSlug?: string;
  areaId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: (typeof RENTAL_PROPERTY_TYPES)[number];
  pets?: boolean;
  pool?: boolean;
  gulfFront?: boolean;
  gulfView?: boolean;
  beachAccess?: (typeof RENTAL_BEACH_ACCESS)[number];
  golfCart?: boolean;
  page: number;
  pageSize: number;
  q?: string;
  /** True when any visitor filter besides page is set — use noindex. */
  hasFilters: boolean;
};

const PAGE_SIZE = 24;

export function parseRentalSearchParams(
  input: Record<string, string | string[] | undefined> | URLSearchParams,
): RentalSearchPlan {
  const raw: Record<string, string> = {};
  if (input instanceof URLSearchParams) {
    for (const [k, v] of input.entries()) raw[k] = v;
  } else {
    for (const [k, v] of Object.entries(input)) {
      if (typeof v === "string") raw[k] = v;
      else if (Array.isArray(v) && typeof v[0] === "string") raw[k] = v[0];
    }
  }

  const parsed = rentalSearchParamsSchema.safeParse(raw);
  const p = (parsed.success ? parsed.data : { page: 1 }) as Partial<RentalSearchParams> & {
    page?: number;
  };

  const hasFilters = Boolean(
    p.town ||
      p.town_id ||
      p.area ||
      p.area_id ||
      p.check_in ||
      p.check_out ||
      p.guests ||
      p.bedrooms ||
      p.bathrooms ||
      p.type ||
      p.pets ||
      p.pool ||
      p.gulf_front ||
      p.gulf_view ||
      p.beach ||
      p.golf_cart ||
      p.q,
  );

  return {
    townSlug: p.town,
    townId: p.town_id,
    areaSlug: p.area,
    areaId: p.area_id,
    checkIn: p.check_in,
    checkOut: p.check_out,
    guests: p.guests,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    propertyType: p.type,
    pets: p.pets,
    pool: p.pool,
    gulfFront: p.gulf_front,
    gulfView: p.gulf_view,
    beachAccess: p.beach,
    golfCart: p.golf_cart,
    page: p.page ?? 1,
    pageSize: PAGE_SIZE,
    q: p.q,
    hasFilters,
  };
}

export function buildStaysSearchUrl(plan: Partial<RentalSearchPlan>, base = "/stays"): string {
  const sp = new URLSearchParams();
  if (plan.townSlug) sp.set("town", plan.townSlug);
  if (plan.townId) sp.set("town_id", plan.townId);
  if (plan.areaSlug) sp.set("area", plan.areaSlug);
  if (plan.areaId) sp.set("area_id", plan.areaId);
  if (plan.checkIn) sp.set("check_in", plan.checkIn);
  if (plan.checkOut) sp.set("check_out", plan.checkOut);
  if (plan.guests) sp.set("guests", String(plan.guests));
  if (plan.bedrooms != null) sp.set("bedrooms", String(plan.bedrooms));
  if (plan.bathrooms != null) sp.set("bathrooms", String(plan.bathrooms));
  if (plan.propertyType) sp.set("type", plan.propertyType);
  if (plan.pets) sp.set("pets", "1");
  if (plan.pool) sp.set("pool", "1");
  if (plan.gulfFront) sp.set("gulf_front", "1");
  if (plan.gulfView) sp.set("gulf_view", "1");
  if (plan.beachAccess) sp.set("beach", plan.beachAccess);
  if (plan.golfCart) sp.set("golf_cart", "1");
  if (plan.q) sp.set("q", plan.q);
  if (plan.page && plan.page > 1) sp.set("page", String(plan.page));
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}
