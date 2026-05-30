import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { runSearch } from "@/lib/search/run-search";
import { priceLevelToBucket } from "@/lib/search/search-plan";
import {
  buildAreaResultsArtifact,
  buildBusinessResultsArtifact,
  buildEmptyArtifact,
  buildFeedbackFormArtifact,
  buildGuideResultsArtifact,
  buildHandoffArtifact,
  buildSubmissionFormArtifact,
  buildTownResultsArtifact,
} from "@/lib/ask/artifacts";
import { confidenceFromSearchPayload, handoffRequired } from "@/lib/ask/confidence";
import { searchAreasInDb } from "@/lib/ask/search-areas";
import { searchGuidesInDb } from "@/lib/ask/search-guides";
import { searchTownsInDb } from "@/lib/ask/search-towns";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import type { ActiveFilters, AskArtifact, SourceReference } from "@/lib/ask/types";
import { startWorkflowByName } from "@/lib/ask/workflow-triggers";

export type AskToolContext = {
  conversationId: string;
  artifactSessionId?: string;
  ipKey?: string;
  userAgent?: string | null;
  /** Updated by tools during a turn */
  artifact?: AskArtifact;
  activeFilters: ActiveFilters;
  sources: SourceReference[];
  confidenceScore: number;
  handoffRequired: boolean;
  followUps: string[];
  shareableSummary?: string;
};

const searchBusinessesSchema = z.object({
  query: z.string().describe("Natural language search query"),
  town_or_area: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dietary_tags: z.array(z.string()).optional(),
  atmosphere_tags: z.array(z.string()).optional(),
  occasion_tags: z.array(z.string()).optional(),
  price_level: z.number().int().min(1).max(4).optional(),
  limit: z.number().int().min(1).max(12).optional(),
});

const editorialSearchSchema = z.object({
  query: z.string().describe("Natural language query for editorial content"),
  limit: z.number().int().min(1).max(12).optional(),
});

const submitListingSchema = z.object({
  submitter_name: z.string().min(1).max(120),
  submitter_email: z.string().email().max(320),
  submitter_phone: z.string().max(40).optional(),
  title: z.string().min(2).max(200),
  town_id: z.string().uuid(),
  address: z.string().max(500).optional(),
  website: z.string().max(500).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().max(320).optional(),
  description: z.string().min(15).max(4000),
  is_storefront: z.boolean().optional(),
  is_service_business: z.boolean().optional(),
  service_area: z.string().max(500).optional(),
});

const feedbackSchema = z.object({
  submitter_name: z.string().min(1).max(120),
  submitter_email: z.string().email().max(320),
  message: z.string().min(15).max(4000),
  business_id: z.string().uuid().optional(),
  listing_context: z.string().max(500).optional(),
});

const handoffSchema = z.object({
  reason: z.string().min(1).max(500),
  submitter_contact: z.string().max(320).optional(),
});

export function createAskTools(ctx: AskToolContext) {
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const openaiKey = process.env.OPENAI_API_KEY;

  return {
    searchBusinesses: tool({
      description:
        "Search verified WhereTo30A business listings. Always use before recommending places.",
      inputSchema: searchBusinessesSchema,
      execute: async (input) => {
        const limit = Math.min(input.limit ?? 10, 12);
        const filters: ActiveFilters = {
          query: input.query,
          town_or_area: input.town_or_area,
          category: input.category,
          tags: input.tags,
          dietary_tags: input.dietary_tags,
          atmosphere_tags: input.atmosphere_tags,
          occasion_tags: input.occasion_tags,
          price_level: input.price_level,
        };
        ctx.activeFilters = { ...ctx.activeFilters, ...filters };

        let constrainTownId: string | undefined;
        if (input.town_or_area) {
          const supabase = getServiceSupabase();
          const slug = input.town_or_area.toLowerCase().replace(/\s+/g, "-");
          const { data: town } = await supabase
            .from("towns")
            .select("id")
            .or(`slug.eq.${slug},title.ilike.${input.town_or_area}`)
            .maybeSingle();
          if (town?.id) constrainTownId = String(town.id);
        }

        const payload = await runSearch({
          rawQuery: input.query,
          model,
          openaiKey,
          pageSize: limit,
          constrainTownId,
          constrainCategorySlug: input.category ?? null,
          constrainPriceBucket: priceLevelToBucket(input.price_level),
          constrainVibeTags: input.tags,
        });

        ctx.confidenceScore = confidenceFromSearchPayload(payload);
        ctx.handoffRequired = handoffRequired(ctx.confidenceScore);
        ctx.followUps = payload.suggestions ?? [];

        if (!payload.recommendations.length) {
          ctx.artifact = buildEmptyArtifact(
            "No verified listings matched. Try broadening the area or category.",
            payload.suggestions,
          );
          return { resultCount: 0, summary: payload.summary };
        }

        const artifact = buildBusinessResultsArtifact(payload, ctx.activeFilters);
        ctx.artifact = artifact;
        ctx.sources = payload.recommendations.map((r) => ({
          type: "business" as const,
          id: r.business_id,
          slug: r.business.slug,
          title: r.business.name,
        }));

        return {
          resultCount: payload.recommendations.length,
          summary: payload.summary,
          confidence: ctx.confidenceScore,
        };
      },
    }),

    searchGuides: tool({
      description:
        "Search published local guides (including guide body text) on WhereTo30A.",
      inputSchema: editorialSearchSchema,
      execute: async (input) => {
        const guides = await searchGuidesInDb({ query: input.query, limit: input.limit });
        if (!guides.length) {
          ctx.artifact = buildEmptyArtifact("No guides matched that query.");
          return { resultCount: 0 };
        }
        ctx.artifact = buildGuideResultsArtifact(
          guides,
          { query: input.query },
          `Guides: ${input.query}`,
        );
        ctx.sources = guides.map((g) => ({
          type: "guide" as const,
          id: g.id,
          slug: g.slug,
          title: g.title,
        }));
        ctx.confidenceScore = guides.length >= 2 ? 0.8 : 0.65;
        return { resultCount: guides.length };
      },
    }),

    searchTowns: tool({
      description:
        "Search published town guides (overview, neighborhoods, tips) on WhereTo30A.",
      inputSchema: editorialSearchSchema,
      execute: async (input) => {
        const towns = await searchTownsInDb({ query: input.query, limit: input.limit });
        if (!towns.length) {
          ctx.artifact = buildEmptyArtifact("No town guides matched that query.");
          return { resultCount: 0 };
        }
        ctx.artifact = buildTownResultsArtifact(
          towns,
          { query: input.query },
          `Towns: ${input.query}`,
        );
        ctx.sources = towns.map((t) => ({
          type: "town" as const,
          id: t.id,
          slug: t.slug,
          title: t.title,
        }));
        ctx.confidenceScore = towns.length >= 2 ? 0.78 : 0.62;
        return { resultCount: towns.length };
      },
    }),

    searchAreas: tool({
      description:
        "Search published area/neighborhood guides on WhereTo30A.",
      inputSchema: editorialSearchSchema,
      execute: async (input) => {
        const areas = await searchAreasInDb({ query: input.query, limit: input.limit });
        if (!areas.length) {
          ctx.artifact = buildEmptyArtifact("No area guides matched that query.");
          return { resultCount: 0 };
        }
        ctx.artifact = buildAreaResultsArtifact(
          areas,
          { query: input.query },
          `Areas: ${input.query}`,
        );
        ctx.sources = areas.map((a) => ({
          type: "area" as const,
          id: a.id,
          slug: a.slug,
          title: a.title,
        }));
        ctx.confidenceScore = areas.length >= 2 ? 0.78 : 0.62;
        return { resultCount: areas.length };
      },
    }),

    openBusinessSubmission: tool({
      description: "Open the business listing submission form in the artifact panel.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.artifact = buildSubmissionFormArtifact();
        return { opened: true };
      },
    }),

    openFeedbackForm: tool({
      description: "Open the listing feedback form in the artifact panel.",
      inputSchema: z.object({
        business_id: z.string().uuid().optional(),
        listing_context: z.string().optional(),
      }),
      execute: async (input) => {
        ctx.artifact = buildFeedbackFormArtifact({
          businessId: input.business_id,
          listingContext: input.listing_context,
        });
        return { opened: true };
      },
    }),

    submitBusinessListing: tool({
      description: "Submit a new business listing request (pending human review).",
      inputSchema: submitListingSchema,
      execute: async (input) => {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
          .from("business_listing_requests")
          .insert({
            submitter_name: input.submitter_name,
            submitter_email: input.submitter_email,
            submitter_phone: input.submitter_phone ?? null,
            title: input.title,
            town_id: input.town_id,
            address: input.address ?? null,
            website: input.website ?? null,
            phone: input.phone ?? null,
            email: input.email ?? null,
            description: input.description,
            is_storefront: input.is_storefront ?? false,
            is_service_business: input.is_service_business ?? false,
            service_area: input.service_area ?? null,
            source_ip: ctx.ipKey ?? null,
            user_agent: ctx.userAgent ?? null,
          })
          .select("id")
          .single();

        if (error) throw new Error("Submission failed");

        await startWorkflowByName("business-submission", {
          requestId: data!.id as string,
          title: input.title,
          email: input.submitter_email,
        });

        ctx.artifact = {
          type: "empty_state",
          title: "Submission received",
          message:
            "Thanks — our team will review your listing request. We do not auto-publish new businesses.",
        };
        return { requestId: data!.id, status: "pending" };
      },
    }),

    createBusinessFeedback: tool({
      description: "Store structured feedback about a listing.",
      inputSchema: feedbackSchema,
      execute: async (input) => {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
          .from("ai_feedback")
          .insert({
            submitter_name: input.submitter_name,
            submitter_email: input.submitter_email,
            message: input.message,
            business_id: input.business_id ?? null,
            listing_context: input.listing_context ?? null,
            conversation_id: ctx.conversationId,
            source_ip: ctx.ipKey ?? null,
            user_agent: ctx.userAgent ?? null,
          })
          .select("id")
          .single();

        if (error) throw new Error("Feedback failed");

        await startWorkflowByName("feedback", {
          feedbackId: data!.id as string,
          email: input.submitter_email,
        });

        ctx.artifact = {
          type: "empty_state",
          title: "Feedback received",
          message: "Thank you — we'll review your note and follow up if needed.",
        };
        return { feedbackId: data!.id };
      },
    }),

    createHumanHandoff: tool({
      description: "Escalate to a human reviewer when confidence is low or user requests help.",
      inputSchema: handoffSchema,
      execute: async (input) => {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
          .from("human_review_tasks")
          .insert({
            reason: input.reason,
            conversation_id: ctx.conversationId,
            artifact_session_id: ctx.artifactSessionId ?? null,
            confidence_score: ctx.confidenceScore,
            submitter_contact: input.submitter_contact ?? null,
          })
          .select("id")
          .single();

        if (error) throw new Error("Handoff failed");

        await startWorkflowByName("human-review", {
          taskId: data!.id as string,
          reason: input.reason,
        });

        ctx.handoffRequired = false;
        ctx.artifact = buildHandoffArtifact(
          data!.id as string,
          "A team member will follow up. You can also email feedback@whereto30a.com.",
        );
        return { taskId: data!.id };
      },
    }),
  };
}
