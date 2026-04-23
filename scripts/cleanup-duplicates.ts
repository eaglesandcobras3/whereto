import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import {
  findDuplicatePairs,
  type BusinessStub,
} from "../lib/admin/duplicate-detection";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  console.log("🔍 Scanning for duplicate businesses...");

  const { data: rows, error } = await supabase
    .from("businesses")
    .select("id, name, town_id, lat, lng, status");

  if (error) {
    console.error("Error fetching businesses:", error);
    return;
  }

  const stubs = (rows ?? []) as BusinessStub[];
  // Increased thresholds: same town, within 500m, very similar name (0.9)
  const pairs = findDuplicatePairs(stubs, { maxDistanceM: 500, minNameSim: 0.9 });

  if (pairs.length === 0) {
    console.log("✅ No clear duplicates found.");
    return;
  }

  console.log(`Found ${pairs.length} potential duplicate pairs.`);

  for (const pair of pairs) {
    // Decision logic: 
    // Usually we want to keep the one that might have more data or is older,
    // but a safe bet for this system is to keep the one that was already there.
    // However, if one has a "google_place_id" and the other doesn't, we keep the Google one.
    
    const { a, b } = pair;
    console.log(`\nDuplicate found: "${a.name}"`);
    console.log(`  A: ${a.id}`);
    console.log(`  B: ${b.id}`);

    // For now, let's just mark the second one as 'suppressed' or 'duplicate'
    // instead of deleting to be safe.
    const { error: updateErr } = await supabase
      .from("businesses")
      .update({ status: "archived", admin_suppressed: true })
      .eq("id", b.id);

    if (updateErr) {
      console.error(`  ✗ Failed to archive ${b.id}:`, updateErr.message);
    } else {
      console.log(`  ✓ Archived B (${b.id})`);
    }
  }

  console.log("\nCleanup complete.");
}

cleanup();
