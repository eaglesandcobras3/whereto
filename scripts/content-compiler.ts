/**
 * Content Compiler (Status-based)
 *
 * Only processes markdown files with status: NEW or status: UPDATED
 * After successful sync, updates status to "published"
 *
 * Usage:
 *   npm run content:compile          # Process NEW/UPDATED files only
 *   npm run content:compile -- --all # Force recompile all published files
 *
 * Workflow:
 *   1. Create/edit .md file, set status: NEW or status: UPDATED
 *   2. Run npm run content:compile
 *   3. File syncs to DB, status changes to "published"
 */

import * as fs from "fs";
import * as path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const matter = require("gray-matter");
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Paths
const CONTENT_DIR = path.join(process.cwd(), "content");

// Type to folder mapping
const TYPE_FOLDERS: Record<string, string> = {
  town: "towns",
  business: "businesses",
  beach: "beaches",
  area: "areas",
  guide: "guides",
  seasonal: "seasonal",
  event: "events",
};

// Statuses that trigger processing
const PROCESS_STATUSES = ["NEW", "UPDATED", "new", "updated"];

// Types
interface FrontmatterData {
  id?: string;
  title: string;
  type: "town" | "business" | "beach" | "area" | "guide" | "seasonal" | "event";
  entity_type: string;
  slug: string;
  status: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  town?: string;
  area?: string;
  region?: string;
  tags?: string[];
  categories?: string[];
  entities?: Array<{ type: string; slug: string; relationship: string }>;
  related_entities?: string[];
  related_pages?: string[];
  featured?: boolean;
  hero_image?: string;
  map_center?: { lat: number; lng: number };
  map_location?: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
  guide_type?: string;
  season?: string;
  price_range?: string;
  hours?: string;
  phone?: string;
  website?: string;
  address?: string;
  parking_notes?: string;
  access_notes?: string;
  /** When `type` is `area`: DB `areas.area_type` (see `point_of_interest` and other area migrations). */
  area_type?: string;
  amenities?: string[];
  family_friendly_score?: number;
  romance_score?: number;
  nightlife_score?: number;
  budget_score?: number;
  // Event-specific fields
  event_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD (optional, for multi-day events)
  venue_name?: string;
  price?: string; // "Free", "$25", etc.
}

interface ParsedContent {
  frontmatter: FrontmatterData;
  content: string;
  filePath: string;
  rawContent: string;
}

interface CompileStats {
  scanned: number;
  processed: number;
  skipped: number;
  errors: string[];
}

/**
 * Update status in the markdown file from NEW/UPDATED to published
 */
function updateStatusInFile(filePath: string, newStatus: string = "published"): void {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    // Replace status line - handles both NEW and UPDATED (case insensitive)
    const updated = fileContent.replace(
      /^status:\s*(NEW|UPDATED|new|updated)\s*$/m,
      `status: ${newStatus}`
    );
    fs.writeFileSync(filePath, updated);
  } catch (error) {
    console.error(`  ✗ Failed to update status in ${filePath}`, error);
  }
}

/**
 * Parse a markdown file and check if it needs processing
 */
function parseMarkdownFile(filePath: string): ParsedContent | null {
  try {
    const rawContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(rawContent);
    return {
      frontmatter: data as FrontmatterData,
      content,
      filePath,
      rawContent,
    };
  } catch (error) {
    console.error(`  ✗ Parse error: ${filePath}`, error);
    return null;
  }
}

/**
 * Find all markdown files in content directories
 */
function findMarkdownFiles(): string[] {
  const files: string[] = [];

  for (const folder of Object.values(TYPE_FOLDERS)) {
    const folderPath = path.join(CONTENT_DIR, folder);
    if (!fs.existsSync(folderPath)) continue;

    const entries = fs.readdirSync(folderPath);
    for (const entry of entries) {
      if (entry.endsWith(".md") && entry !== "README.md") {
        files.push(path.join(folderPath, entry));
      }
    }
  }

  // Also check inbox
  const inboxPath = path.join(CONTENT_DIR, "inbox");
  if (fs.existsSync(inboxPath)) {
    const entries = fs.readdirSync(inboxPath);
    for (const entry of entries) {
      if (entry.endsWith(".md")) {
        files.push(path.join(inboxPath, entry));
      }
    }
  }

  return files;
}

/**
 * Get region ID by slug
 */
async function getRegionId(regionSlug: string | undefined): Promise<number | null> {
  if (!regionSlug) return null;
  const { data } = await supabase
    .from("regions")
    .select("id")
    .eq("slug", regionSlug)
    .single();
  return data?.id || null;
}

/**
 * Get town ID by slug
 */
async function getTownId(townSlug: string | undefined): Promise<number | null> {
  if (!townSlug) return null;
  const { data } = await supabase
    .from("towns")
    .select("id")
    .eq("slug", townSlug)
    .single();
  return data?.id || null;
}

/**
 * Sync TOWN to towns table
 */
async function syncTown(parsed: ParsedContent): Promise<boolean> {
  const { frontmatter, content } = parsed;
  const regionId = await getRegionId(frontmatter.region);

  const { error } = await supabase.from("towns").upsert(
    {
      name: frontmatter.title,
      slug: frontmatter.slug,
      region_id: regionId,
      center_lat:
        frontmatter.latitude ||
        frontmatter.map_center?.lat ||
        frontmatter.map_location?.lat ||
        30.3,
      center_lng:
        frontmatter.longitude ||
        frontmatter.map_center?.lng ||
        frontmatter.map_location?.lng ||
        -86.1,
      search_radius_meters: 5000,
      ai_tagline: frontmatter.seo_description?.slice(0, 100),
      ai_description: content.slice(0, 500).replace(/[#*\[\]`]/g, ""),
      ai_family_score: frontmatter.family_friendly_score,
      ai_romance_score: frontmatter.romance_score,
      ai_nightlife_score: frontmatter.nightlife_score,
      ai_budget_score: frontmatter.budget_score,
      ai_vibe: frontmatter.tags,
    },
    { onConflict: "slug" }
  );

  if (error) {
    console.error(`  ✗ Town sync failed: ${error.message}`);
    return false;
  }
  return true;
}

/**
 * Sync BUSINESS to businesses table
 */
async function syncBusiness(parsed: ParsedContent): Promise<boolean> {
  const { frontmatter, content } = parsed;
  const townId = await getTownId(frontmatter.town);

  const { error } = await supabase.from("businesses").upsert(
    {
      name: frontmatter.title,
      slug: frontmatter.slug,
      status: "active",
      town_id: townId,
      address: frontmatter.address,
      phone: frontmatter.phone,
      website: frontmatter.website,
      price_level: frontmatter.price_range ? frontmatter.price_range.length : null,
      lat:
        frontmatter.latitude ||
        frontmatter.map_center?.lat ||
        frontmatter.map_location?.lat,
      lng:
        frontmatter.longitude ||
        frontmatter.map_center?.lng ||
        frontmatter.map_location?.lng,
      hero_image_url: frontmatter.hero_image,
      ai_summary: frontmatter.seo_description || content.slice(0, 200),
    },
    { onConflict: "slug" }
  );

  if (error) {
    console.error(`  ✗ Business sync failed: ${error.message}`);
    return false;
  }
  return true;
}

/**
 * Sync BEACH to beaches table
 */
async function syncBeach(parsed: ParsedContent): Promise<boolean> {
  const { frontmatter } = parsed;
  const townId = await getTownId(frontmatter.town);

  const { error } = await supabase.from("beaches").upsert(
    {
      name: frontmatter.title,
      slug: frontmatter.slug,
      town_id: townId,
      latitude:
        frontmatter.latitude ||
        frontmatter.map_center?.lat ||
        frontmatter.map_location?.lat,
      longitude:
        frontmatter.longitude ||
        frontmatter.map_center?.lng ||
        frontmatter.map_location?.lng,
      access_notes: frontmatter.access_notes,
      parking_notes: frontmatter.parking_notes,
      amenities: frontmatter.amenities,
      family_friendly_score: frontmatter.family_friendly_score,
    },
    { onConflict: "slug" }
  );

  if (error) {
    console.error(`  ✗ Beach sync failed: ${error.message}`);
    return false;
  }
  return true;
}

/**
 * Sync AREA to areas table
 */
const AREA_TYPES_DB = new Set([
  "shopping_area",
  "district",
  "square",
  "development",
  "neighborhood",
  "point_of_interest",
]);

async function syncArea(parsed: ParsedContent): Promise<boolean> {
  const { frontmatter } = parsed;
  const townId = await getTownId(frontmatter.town);
  const rawType = frontmatter.area_type?.trim();
  const areaType =
    rawType && AREA_TYPES_DB.has(rawType) ? rawType : "neighborhood";

  const lat =
    frontmatter.latitude ??
    frontmatter.map_center?.lat ??
    frontmatter.map_location?.lat;
  const lng =
    frontmatter.longitude ??
    frontmatter.map_center?.lng ??
    frontmatter.map_location?.lng;

  const { error } = await supabase.from("areas").upsert(
    {
      name: frontmatter.title,
      slug: frontmatter.slug,
      town_id: townId,
      area_type: areaType,
      description_short: frontmatter.seo_description,
      parking_notes: frontmatter.parking_notes,
      latitude_center: lat ?? null,
      longitude_center: lng ?? null,
    },
    { onConflict: "slug" }
  );

  if (error) {
    console.error(`  ✗ Area sync failed: ${error.message}`);
    return false;
  }
  return true;
}

/**
 * Sync GUIDE to guides table
 */
async function syncGuide(parsed: ParsedContent): Promise<boolean> {
  const { frontmatter, content } = parsed;
  const townId = await getTownId(frontmatter.town);

  // First sync to guides table
  const { error: guideError } = await supabase.from("guides").upsert(
    {
      slug: frontmatter.slug,
      title: frontmatter.title,
      guide_type: frontmatter.guide_type || "editorial",
      primary_town_id: townId,
      season: frontmatter.season,
      featured: frontmatter.featured || false,
    },
    { onConflict: "slug" }
  );

  if (guideError) {
    console.error(`  ✗ Guide sync failed: ${guideError.message}`);
    return false;
  }

  // Also sync to pages table for rendering
  const { error: pageError } = await supabase.from("pages").upsert(
    {
      slug: frontmatter.slug,
      page_type: "guide",
      title: frontmatter.title,
      body_markdown: content,
      seo_title: frontmatter.seo_title,
      seo_description: frontmatter.seo_description,
      seo_keywords: frontmatter.seo_keywords,
      og_image_url: frontmatter.hero_image,
      status: "published",
    },
    { onConflict: "slug" }
  );

  if (pageError) {
    console.error(`  ✗ Page sync failed: ${pageError.message}`);
    return false;
  }

  return true;
}

/**
 * Sync EVENT to events table
 */
async function syncEvent(parsed: ParsedContent): Promise<boolean> {
  const { frontmatter, content } = parsed;
  const townId = await getTownId(frontmatter.town);

  // Validate event_date is required
  if (!frontmatter.event_date) {
    console.error(`  ✗ Event requires event_date field`);
    return false;
  }

  const { error } = await supabase.from("events").upsert(
    {
      slug: frontmatter.slug,
      title: frontmatter.title,
      description: frontmatter.seo_description || content.slice(0, 500).replace(/[#*\[\]`]/g, ""),
      hero_image_url: frontmatter.hero_image,
      event_date: frontmatter.event_date,
      end_date: frontmatter.end_date || null,
      town_id: townId,
      venue_name: frontmatter.venue_name,
      address: frontmatter.address,
      lat:
        frontmatter.latitude ||
        frontmatter.map_center?.lat ||
        frontmatter.map_location?.lat,
      lng:
        frontmatter.longitude ||
        frontmatter.map_center?.lng ||
        frontmatter.map_location?.lng,
      price: frontmatter.price,
      website: frontmatter.website,
      tags: frontmatter.tags,
      status: "active",
    },
    { onConflict: "slug" }
  );

  if (error) {
    console.error(`  ✗ Event sync failed: ${error.message}`);
    return false;
  }
  return true;
}

/**
 * Move file from inbox to correct folder based on type
 */
function moveFromInbox(parsed: ParsedContent): string {
  const { frontmatter, filePath } = parsed;

  // Only move if in inbox
  if (!filePath.includes("/inbox/")) {
    return filePath;
  }

  const folder = TYPE_FOLDERS[frontmatter.type];
  if (!folder) {
    return filePath;
  }

  const targetDir = path.join(CONTENT_DIR, folder);
  const targetPath = path.join(targetDir, `${frontmatter.slug}.md`);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.renameSync(filePath, targetPath);
  return targetPath;
}

/**
 * Sync a file to the database based on its type
 */
async function syncToDatabase(parsed: ParsedContent): Promise<boolean> {
  const { frontmatter } = parsed;

  switch (frontmatter.type) {
    case "town":
      return syncTown(parsed);
    case "business":
      return syncBusiness(parsed);
    case "beach":
      return syncBeach(parsed);
    case "area":
      return syncArea(parsed);
    case "guide":
      return syncGuide(parsed);
    case "seasonal":
      return syncGuide(parsed); // Treat seasonal as guide
    case "event":
      return syncEvent(parsed);
    default:
      console.error(`  ✗ Unknown type: ${frontmatter.type}`);
      return false;
  }
}

/**
 * Main compiler
 */
async function main() {
  const args = process.argv.slice(2);
  const forceAll = args.includes("--all");

  console.log("\n🚀 Content Compiler\n" + "=".repeat(40));
  console.log(forceAll ? "Mode: Full recompile (--all)\n" : "Mode: NEW/UPDATED only\n");

  const stats: CompileStats = { scanned: 0, processed: 0, skipped: 0, errors: [] };

  const allFiles = findMarkdownFiles();
  stats.scanned = allFiles.length;

  console.log(`📂 Found ${allFiles.length} markdown files\n`);

  for (const filePath of allFiles) {
    const parsed = parseMarkdownFile(filePath);
    if (!parsed) {
      stats.errors.push(`Parse failed: ${path.basename(filePath)}`);
      continue;
    }

    const { frontmatter } = parsed;
    const fileName = path.basename(filePath);
    const shouldProcess = forceAll || PROCESS_STATUSES.includes(frontmatter.status);

    if (!shouldProcess) {
      stats.skipped++;
      continue;
    }

    // Validate required fields
    if (!frontmatter.title || !frontmatter.type || !frontmatter.slug) {
      console.log(`⚠ ${fileName} - missing required fields (title, type, or slug)`);
      stats.errors.push(`Invalid: ${fileName}`);
      continue;
    }

    console.log(`→ ${fileName} [${frontmatter.status.toUpperCase()}]`);

    // Move from inbox if needed
    const finalPath = moveFromInbox(parsed);
    if (finalPath !== filePath) {
      parsed.filePath = finalPath;
      console.log(`  ↳ Moved to ${path.basename(path.dirname(finalPath))}/`);
    }

    // Sync to database
    const success = await syncToDatabase(parsed);

    if (success) {
      // Update status in file to published
      updateStatusInFile(parsed.filePath, "published");
      console.log(`  ✓ Synced → status: published`);
      stats.processed++;
    } else {
      stats.errors.push(`Sync failed: ${fileName}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(40));
  console.log("📊 Summary");
  console.log("=".repeat(40));
  console.log(`📄 Scanned:   ${stats.scanned}`);
  console.log(`✓ Processed: ${stats.processed}`);
  console.log(`⊘ Skipped:   ${stats.skipped} (already published)`);

  if (stats.errors.length > 0) {
    console.log(`✗ Errors:    ${stats.errors.length}`);
    stats.errors.forEach((e) => console.log(`  - ${e}`));
  }

  console.log("\n✅ Done!\n");
  process.exit(stats.errors.length > 0 ? 1 : 0);
}

main();
