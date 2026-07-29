import { z } from "zod";

export const COMMUNITY_TIP_ENTITY_TYPES = ["business", "town", "area", "guide"] as const;
export type CommunityTipEntityType = (typeof COMMUNITY_TIP_ENTITY_TYPES)[number];

export const COMMUNITY_TIP_STATUSES = ["pending", "published", "rejected", "hidden"] as const;
export type CommunityTipStatus = (typeof COMMUNITY_TIP_STATUSES)[number];

export const COMMUNITY_TIP_BODY_MIN = 15;
export const COMMUNITY_TIP_BODY_MAX = 2000;
export const COMMUNITY_TIP_CITY_MAX = 80;

/** Max tip creates/updates per user per rolling window (default 24h). */
export const COMMUNITY_TIPS_USER_RATE_MAX = 5;
export const COMMUNITY_TIPS_USER_RATE_WINDOW_SEC = 24 * 60 * 60;

export const communityTipEntityTypeSchema = z.enum(COMMUNITY_TIP_ENTITY_TYPES);

/** Optional 1–5 stars; omit or null for text-only tips. */
export const communityTipRatingSchema = z.number().int().min(1).max(5).optional().nullable();

export const communityTipUpsertSchema = z.object({
  entity_type: communityTipEntityTypeSchema,
  entity_id: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(COMMUNITY_TIP_BODY_MIN, `Write at least ${COMMUNITY_TIP_BODY_MIN} characters.`)
    .max(COMMUNITY_TIP_BODY_MAX),
  rating: communityTipRatingSchema,
  attribution_city: z
    .string()
    .trim()
    .max(COMMUNITY_TIP_CITY_MAX)
    .optional()
    .nullable()
    .transform((s) => {
      if (s == null) return null;
      const t = s.trim();
      return t.length ? t : null;
    }),
});

export type CommunityTipUpsertInput = z.infer<typeof communityTipUpsertSchema>;

export const communityTipUpdateSchema = z
  .object({
    id: z.string().uuid(),
    body: z
      .string()
      .trim()
      .min(COMMUNITY_TIP_BODY_MIN)
      .max(COMMUNITY_TIP_BODY_MAX)
      .optional(),
    rating: communityTipRatingSchema,
    attribution_city: z
      .string()
      .trim()
      .max(COMMUNITY_TIP_CITY_MAX)
      .optional()
      .nullable()
      .transform((s) => {
        if (s == null) return null;
        const t = s.trim();
        return t.length ? t : null;
      }),
  })
  .refine(
    (d) => d.body !== undefined || d.rating !== undefined || d.attribution_city !== undefined,
    { message: "Nothing to update." },
  );

export const profileAttributionCitySchema = z.object({
  attribution_city: z
    .string()
    .trim()
    .max(COMMUNITY_TIP_CITY_MAX)
    .nullable()
    .transform((s) => {
      if (s == null) return null;
      const t = s.trim();
      return t.length ? t : null;
    }),
});

export type PublicCommunityTip = {
  id: string;
  body: string;
  rating: number | null;
  attribution_city: string | null;
  created_at: string;
};

export type OwnCommunityTip = PublicCommunityTip & {
  entity_type: CommunityTipEntityType;
  entity_id: string;
  status: CommunityTipStatus;
  updated_at: string;
  entity_title?: string | null;
  entity_href?: string | null;
};

export type AdminCommunityTip = OwnCommunityTip & {
  user_id: string;
  admin_notes: string | null;
  reviewed_at: string | null;
};
