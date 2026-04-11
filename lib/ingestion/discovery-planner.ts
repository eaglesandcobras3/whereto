import OpenAI from "openai";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export type DiscoveryPlanTask = {
  query: string;
  strategy: "town_expansion" | "subcategory" | "synonym" | "intent";
  town_id: number;
};

/**
 * Uses AI to expand broad categories into a comprehensive set of discovery tasks.
 */
export async function generateDiscoveryPlan(params: {
  categories: string[];
  towns: { id: number; name: string }[];
}): Promise<DiscoveryPlanTask[]> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const townList = params.towns.map((t) => `${t.name} (id: ${t.id})`).join(", ");
  const catList = params.categories.join(", ");

  const prompt = `
You are a Discovery Architect for a local directory platform.
Your goal is to expand broad categories into specific search passes for the Geoapify Places API.

TOWNS (with IDs):
${townList}

INPUT CATEGORIES:
${catList}

For each input category, generate 10-15 highly specific search tasks. 
Use subcategories, intent-based searches (e.g. "brunch", "beachfront"), and synonyms.

Return a JSON object with this exact structure:
{
  "tasks": [
    {
      "query": "exact search string",
      "strategy": "town_expansion | subcategory | synonym | intent",
      "town_id": number
    }
  ]
}

JSON ONLY. No prose.
  `;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  const parsed = JSON.parse(content) as { tasks: DiscoveryPlanTask[] };
  return parsed.tasks ?? [];
}

/**
 * Queues the generated tasks into the search_jobs table.
 */
export async function queueDiscoveryPlan(params: {
  parentCategory: string;
  categoryId: number;
  tasks: DiscoveryPlanTask[];
  createdBy: string;
}) {
  const supabase = getServiceSupabase();

  const toInsert = params.tasks.map((task) => ({
    job_type: "discovery",
    category_id: params.categoryId,
    town_id: task.town_id,
    query_string: task.query,
    status: "pending",
    priority: 5,
    next_run_after: new Date().toISOString(),
    payload_json: {
      strategy: task.strategy,
      parent_category_name: params.parentCategory,
      planned_by: params.createdBy,
    },
  }));

  const { error } = await supabase.from("search_jobs").insert(toInsert);
  if (error) throw error;

  return toInsert.length;
}
