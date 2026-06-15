/**
 * Validate that every tag used in data/search-query-rules.json (requiredTags + anyTags)
 * exists in the search_tags_vocabulary table.
 *
 * Run: npx tsx scripts/validate-tag-registry.ts
 * CI:  exits 1 if any rule tag is missing from the registry.
 *
 * Also checks:
 *   - Rule count stays under the 40-rule budget
 *   - Every rule has a problemClass field
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import rulesData from "@/data/search-query-rules.json";

dotenv.config({ path: ".env.local" });

const RULE_BUDGET = 40;

type Rule = {
  id: string;
  problemClass?: string;
  plan: { requiredTags?: string[]; anyTags?: string[] };
};

async function main() {
  const rules = rulesData.rules as Rule[];
  let failed = false;

  // ── Rule budget ─────────────────────────────────────────────────────────────
  if (rules.length > RULE_BUDGET) {
    console.error(`✗ Rule count ${rules.length} exceeds budget of ${RULE_BUDGET}.`);
    failed = true;
  } else {
    console.log(`✓ Rule count ${rules.length}/${RULE_BUDGET}`);
  }

  // ── problemClass presence ───────────────────────────────────────────────────
  const missingClass = rules.filter(r => !r.problemClass);
  if (missingClass.length > 0) {
    console.error(`✗ Rules missing problemClass: ${missingClass.map(r => r.id).join(", ")}`);
    failed = true;
  } else {
    console.log(`✓ All rules have problemClass`);
  }

  // ── Tag registry check ──────────────────────────────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  const { data: vocabRows, error } = await supabase
    .from("search_tags_vocabulary")
    .select("tag");

  if (error) {
    console.error(`✗ Could not fetch search_tags_vocabulary: ${error.message}`);
    console.error("  (If the migration hasn't been applied yet, run it first.)");
    process.exit(1);
  }

  const vocab = new Set((vocabRows ?? []).map((r: { tag: string }) => r.tag));

  const allRuleTags = rules.flatMap(r => [
    ...(r.plan.requiredTags ?? []),
    ...(r.plan.anyTags ?? []),
  ]);
  const uniqueRuleTags = [...new Set(allRuleTags)];
  const missingTags = uniqueRuleTags.filter(t => !vocab.has(t));

  if (missingTags.length > 0) {
    console.error(`✗ Tags used in rules but missing from search_tags_vocabulary:`);
    for (const t of missingTags) {
      const rules_using = rules.filter(r =>
        [...(r.plan.requiredTags ?? []), ...(r.plan.anyTags ?? [])].includes(t)
      ).map(r => r.id);
      console.error(`    "${t}" — used by: ${rules_using.join(", ")}`);
    }
    console.error(`  Add missing tags to: supabase/migrations/20260614000100_search_tags_vocabulary.sql`);
    failed = true;
  } else {
    console.log(`✓ All ${uniqueRuleTags.length} rule tags exist in vocabulary`);
  }

  if (failed) process.exit(1);
  console.log("\n✓ Tag registry valid");
}

main().catch(e => { console.error(e); process.exit(1); });
