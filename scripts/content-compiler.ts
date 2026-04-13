/**
 * Content Compiler (Inbox-based)
 *
 * Drop markdown files into /content/inbox and run this script.
 * Files are parsed, synced to Supabase, and moved to the correct folder.
 *
 * Usage:
 *   npm run content:compile          # Process inbox + changed files
 *   npm run content:compile -- --all # Full recompile (all files)
 *
 * Workflow:
 *   1. Drop .md files into content/inbox/
 *   2. Run npm run content:compile
 *   3. Files are parsed, validated, synced to DB
 *   4. Files are moved to correct folder based on type
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
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
const INBOX_DIR = path.join(CONTENT_DIR, "inbox");
const PROCESSED_MANIFEST = path.join(CONTENT_DIR, ".processed.json");

// Type to folder mapping
const TYPE_FOLDERS: Record<string, string> = {
  town: "towns",
  business: "businesses",
  beach: "beaches",
  area: "areas",
  guide: "guides",
  seasonal: "seasonal",
};

// Types
interface FrontmatterData {
  id?: string;
  title: string;
  type: "town" | "business" | "beach" | "area" | "guide" | "seasonal";
  entity_type: string;
  slug: string;
  status: "draft" | "published" | "archived";
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  town?: string;
  area?: string;
  region?: string;
  state?: string;
  country?: string;
  tags?: string[];
  categories?: string[];
  search_intent?: string[];
  entities?: Array<{ type: string; slug: string; relationship: string }>;
  related_entities?: string[];
  related_pages?: string[];
  featured?: boolean;
  hero_image?: string;
  gallery?: string[];
  map_center?: { lat: number; lng: number };
  map_location?: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
  reading_time?: number;
  last_updated?: string;
  guide_type?: string;
  season?: string;
  price_range?: string;
  hours?: string;
  phone?: string;
  website?: string;
  address?: string;
  parking_notes?: string;
  access_notes?: string;
  amenities?: string[];
  family_friendly_score?: number;
  romance_score?: number;
  nightlife_score?: number;
  budget_score?: number;
}

interface ParsedContent {
  frontmatter: FrontmatterData;
  content: string;
  filePath: string;
  hash: string;
  links: string[];
}

interface ProcessedManifest {
  files: Record<string, { hash: string; processedAt: string }>;
}

interface CompileStats {
  processed: number;
  skipped: number;
  moved: number;
  errors: string[];
}

// Regex for wiki-style links
const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;

/**
 * Calculate file hash for change detection
 */
function hashFile(content: string): string {
  return crypto.createHash("md5").update(content).digest("hex");
}

/**
 * Inject ID into markdown frontmatter if it was found in DB but missing in file
 */
function injectIdToFile(filePath: string, id: string): void {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const lines = fileContent.split("\n");
    
    // Find the second ---
    let dashCount = 0;
    let insertIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        dashCount++;
        if (dashCount === 1) {
          insertIndex = i + 1;
          break;
        }
      }
    }
    
    if (insertIndex !== -1) {
      lines.splice(insertIndex, 0, `id: "${id}"`);
      fs.writeFileSync(filePath, lines.join("\n"));
      console.log(`  ✎ Injected id: ${id} into ${path.basename(filePath)}`);
    }
  } catch (error) {
    console.error(`  ✗ Failed to inject ID into ${filePath}`, error);
  }
}

/**
 * Load processed manifest
 */
function loadManifest(): ProcessedManifest {
  try {
    if (fs.existsSync(PROCESSED_MANIFEST)) {
      return JSON.parse(fs.readFileSync(PROCESSED_MANIFEST, "utf-8"));
    }
  } catch {}
  return { files: {} };
}

/**
 * Save processed manifest
 */
function saveManifest(manifest: ProcessedManifest): void {
  fs.writeFileSync(PROCESSED_MANIFEST, JSON.stringify(manifest, null, 2));
}

/**
 * Parse a markdown file
 */
function parseMarkdownFile(filePath: string): ParsedContent | null {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    // Extract wiki-style links
    const links: string[] = [];
    let match;
    while ((match = WIKI_LINK_REGEX.exec(content)) !== null) {
      links.push(match[1]);
    }

    return {
      frontmatter: data as FrontmatterData,
      content,
      filePath,
      hash: hashFile(fileContent),
      links,
    };
  } catch (error) {
    console.error(`  ✗ Parse error: ${filePath}`, error);
    return null;
  }
}

/**
 * Validate frontmatter has required fields
 */
function validateFrontmatter(fm: FrontmatterData, filePath: string): string[] {
  const errors: string[] = [];
  if (!fm.title) errors.push("Missing required field: title");
  if (!fm.type) errors.push("Missing required field: type");
  if (!fm.slug) errors.push("Missing required field: slug");
  if (!fm.status) errors.push("Missing required field: status");
  if (fm.type && !TYPE_FOLDERS[fm.type]) {
    errors.push(`Unknown type: ${fm.type}. Must be one of: ${Object.keys(TYPE_FOLDERS).join(", ")}`);
  }
  return errors;
}

/**
 * Get or create region ID
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
 * Sync TOWN to existing towns table
 */
async function syncTown(parsed: ParsedContent): Promise<number | null> {
  const { frontmatter, content } = parsed;
  const regionId = await getRegionId(frontmatter.region);

  // Try to find existing town by name to prevent duplicates
  let activeId = frontmatter.id;
  let activeSlug = frontmatter.slug;

  const { data: existing } = await supabase
    .from("towns")
    .select("id, slug")
    .eq("name", frontmatter.title)
    .maybeSingle();
  
  if (existing) {
    activeId = existing.id.toString();
    activeSlug = existing.slug;

    // Write ID back to frontmatter if missing
    if (!frontmatter.id && activeId) {
      injectIdToFile(parsed.filePath, activeId);
    }
  }

  const { data, error } = await supabase
    .from("towns")
    .upsert(
      {
        ...(activeId ? { id: parseInt(activeId) } : {}),
        name: frontmatter.title,
        slug: activeSlug,
        region_id: regionId,
        center_lat: frontmatter.latitude || frontmatter.map_center?.lat || frontmatter.map_location?.lat || 30.3, 
        center_lng: frontmatter.longitude || frontmatter.map_center?.lng || frontmatter.map_location?.lng || -86.1,
        search_radius_meters: 5000,
        ai_tagline: frontmatter.seo_description?.slice(0, 100),
        ai_description: content.slice(0, 500).replace(/[#*\[\]`]/g, ""),
        ai_family_score: frontmatter.family_friendly_score,
        ai_romance_score: frontmatter.romance_score,
        ai_nightlife_score: frontmatter.nightlife_score,
        ai_budget_score: frontmatter.budget_score,
        ai_vibe: frontmatter.tags,
      },
      { onConflict: activeId ? "id" : "slug" }
    )
    .select("id")
    .single();

  if (error) {
    console.error(`  ✗ Town sync failed: ${error.message}`);
    return null;
  }
  return data?.id || null;
}

/**
 * Sync BUSINESS to existing businesses table
 */
async function syncBusiness(parsed: ParsedContent): Promise<string | null> {
  const { frontmatter, content } = parsed;
  const townId = await getTownId(frontmatter.town);

  // 1. Resolve ID and Slug
  let activeId = frontmatter.id;
  let activeSlug = frontmatter.slug;

  if (townId) {
    const { data: existing } = await supabase
      .from("businesses")
      .select("id, slug")
      .eq("name", frontmatter.title)
      .eq("town_id", townId)
      .maybeSingle();
    
    if (existing) {
      activeId = existing.id;
      activeSlug = existing.slug;

      // Write ID back to frontmatter if missing
      if (!frontmatter.id && activeId) {
        injectIdToFile(parsed.filePath, activeId);
      }
    }
  }

  const { data, error } = await supabase
    .from("businesses")
    .upsert(
      {
        ...(activeId ? { id: activeId } : {}),
        name: frontmatter.title,
        slug: activeSlug,
        town_id: townId,
        address: frontmatter.address,
        phone: frontmatter.phone,
        website: frontmatter.website,
        // Removed 'hours' which doesn't exist in businesses table
        price_level: frontmatter.price_range ? frontmatter.price_range.length : null, 
        lat: frontmatter.latitude || frontmatter.map_center?.lat || frontmatter.map_location?.lat,
        lng: frontmatter.longitude || frontmatter.map_center?.lng || frontmatter.map_location?.lng,
        hero_image_url: frontmatter.hero_image,
        ai_summary: frontmatter.seo_description || content.slice(0, 200),
      },
      { onConflict: activeId ? "id" : "slug" }
    )
    .select("id")
    .single();

  if (error) {
    console.error(`  ✗ Business sync failed: ${error.message}`);
    return null;
  }
  return data?.id || null;
}

/**
 * Sync BEACH to beaches table
 */
async function syncBeach(parsed: ParsedContent): Promise<number | null> {
  const { frontmatter, content } = parsed;
  const townId = await getTownId(frontmatter.town);

  const { data, error } = await supabase
    .from("beaches")
    .upsert(
      {
        name: frontmatter.title,
        slug: frontmatter.slug,
        town_id: townId,
        latitude: frontmatter.latitude || frontmatter.map_center?.lat || frontmatter.map_location?.lat,
        longitude: frontmatter.longitude || frontmatter.map_center?.lng || frontmatter.map_location?.lng,
        access_notes: frontmatter.access_notes,
        parking_notes: frontmatter.parking_notes,
        amenities: frontmatter.amenities,
        family_friendly_score: frontmatter.family_friendly_score,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (error) {
    console.error(`  ✗ Beach sync failed: ${error.message}`);
    return null;
  }
  return data?.id || null;
}

/**
 * Sync AREA to areas table
 */
async function syncArea(parsed: ParsedContent): Promise<number | null> {
  const { frontmatter } = parsed;
  const townId = await getTownId(frontmatter.town);

  const { data, error } = await supabase
    .from("areas")
    .upsert(
      {
        name: frontmatter.title,
        slug: frontmatter.slug,
        town_id: townId,
        area_type: "shopping_area",
        description_short: frontmatter.seo_description,
        parking_notes: frontmatter.parking_notes,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (error) {
    console.error(`  ✗ Area sync failed: ${error.message}`);
    return null;
  }
  return data?.id || null;
}

/**
 * Sync GUIDE to guides table
 */
async function syncGuide(parsed: ParsedContent): Promise<number | null> {
  const { frontmatter } = parsed;
  const townId = await getTownId(frontmatter.town);

  const { data, error } = await supabase
    .from("guides")
    .upsert(
      {
        slug: frontmatter.slug,
        title: frontmatter.title,
        guide_type: frontmatter.guide_type || "editorial",
        primary_town_id: townId,
        season: frontmatter.season,
        featured: frontmatter.featured || false,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (error) {
    console.error(`  ✗ Guide sync failed: ${error.message}`);
    return null;
  }
  return data?.id || null;
}

/**
 * Sync a parsed file to Supabase (both legacy tables and new tables)
 */
async function syncToDatabase(parsed: ParsedContent): Promise<boolean> {
  const { frontmatter, content } = parsed;

  try {
    // 1. Sync to legacy/existing tables based on type
    let legacyId: string | number | null = null;

    switch (frontmatter.type) {
      case "town":
        legacyId = await syncTown(parsed);
        break;
      case "business":
        legacyId = await syncBusiness(parsed);
        break;
      case "beach":
        legacyId = await syncBeach(parsed);
        break;
      case "area":
        legacyId = await syncArea(parsed);
        break;
      case "guide":
        legacyId = await syncGuide(parsed);
        break;
    }

    if (!legacyId && frontmatter.type !== "seasonal") {
      return false;
    }

    // 2. Also sync to new entities table (for future migration)
    const { data: entity } = await supabase
      .from("entities")
      .upsert(
        {
          slug: frontmatter.slug,
          entity_type: frontmatter.entity_type || frontmatter.type,
          title: frontmatter.title,
          status: frontmatter.status,
          excerpt: frontmatter.seo_description,
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    // 3. Sync to pages table
    let canonicalUrl = `/${frontmatter.slug}`;
    if (frontmatter.type === "business") canonicalUrl = `/business/${frontmatter.slug}`;
    else if (frontmatter.type === "guide") canonicalUrl = `/guide/${frontmatter.slug}`;
    else if (frontmatter.type === "beach") canonicalUrl = `/beach/${frontmatter.slug}`;

    const { data: page } = await supabase
      .from("pages")
      .upsert(
        {
          slug: frontmatter.slug,
          entity_id: entity?.id,
          page_type: frontmatter.type,
          title: frontmatter.title,
          markdown_path: parsed.filePath.replace(process.cwd(), ""),
          body_markdown: content,
          excerpt: frontmatter.seo_description,
          seo_title: frontmatter.seo_title,
          seo_description: frontmatter.seo_description,
          seo_keywords: frontmatter.seo_keywords,
          og_image_url: frontmatter.hero_image,
          status: frontmatter.status,
          content_hash: parsed.hash,
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    // 4. Sync search document
    const searchableText = [
      frontmatter.title,
      frontmatter.seo_title,
      frontmatter.seo_description,
      ...(frontmatter.tags || []),
      ...(frontmatter.categories || []),
      content.replace(/[#*\[\]`]/g, "").slice(0, 5000),
    ]
      .filter(Boolean)
      .join(" ");

    if (page) {
      await supabase.from("search_documents").upsert(
        {
          source_type: frontmatter.type === "business" ? "business" : "page",
          source_id: page.id,
          entity_id: entity?.id,
          page_id: page.id,
          title: frontmatter.title,
          slug: frontmatter.slug,
          town_slug: frontmatter.town,
          page_type: frontmatter.type,
          entity_type: frontmatter.entity_type || frontmatter.type,
          tags: frontmatter.tags || [],
          categories: frontmatter.categories || [],
          searchable_text: searchableText,
          excerpt: frontmatter.seo_description || content.slice(0, 200),
          boost_score: frontmatter.featured ? 1.5 : 1.0,
        },
        { onConflict: "page_id" }
      );
    }

    // 5. Process wiki links
    for (const targetSlug of parsed.links) {
      const { data: targetPage } = await supabase
        .from("pages")
        .select("id")
        .eq("slug", targetSlug)
        .single();

      if (targetPage && page) {
        await supabase.from("page_links").upsert(
          {
            source_page_id: page.id,
            target_page_id: targetPage.id,
            link_type: "body_link",
            anchor_text: targetSlug,
          },
          { onConflict: "source_page_id,target_page_id,link_type" }
        );
      } else if (!targetPage) {
        await supabase.from("content_opportunities").upsert(
          {
            source_page_id: page?.id,
            suggested_slug: targetSlug,
            suggested_type: "unknown",
            reason: `Referenced in [[${frontmatter.slug}]]`,
            status: "pending",
          },
          { onConflict: "suggested_slug" }
        );
      }
    }

    return true;
  } catch (error) {
    console.error(`  ✗ Database sync error:`, error);
    return false;
  }
}

/**
 * Move file from inbox to correct folder
 */
function moveToFolder(parsed: ParsedContent): string | null {
  const { frontmatter, filePath } = parsed;
  const folder = TYPE_FOLDERS[frontmatter.type];

  if (!folder) return null;

  // Only move if in inbox
  if (!filePath.includes("/inbox/")) return filePath;

  const targetDir = path.join(CONTENT_DIR, folder);
  const targetPath = path.join(targetDir, `${frontmatter.slug}.md`);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.renameSync(filePath, targetPath);
  return targetPath;
}

/**
 * Process inbox files
 */
async function processInbox(stats: CompileStats, manifest: ProcessedManifest): Promise<void> {
  if (!fs.existsSync(INBOX_DIR)) {
    fs.mkdirSync(INBOX_DIR, { recursive: true });
    console.log("📥 Created inbox folder: content/inbox/");
    return;
  }

  const files = fs.readdirSync(INBOX_DIR).filter((f) => f.endsWith(".md"));

  if (files.length === 0) {
    console.log("📥 Inbox is empty\n");
    return;
  }

  console.log(`📥 Processing ${files.length} file(s) from inbox...\n`);

  for (const file of files) {
    const filePath = path.join(INBOX_DIR, file);
    console.log(`→ ${file}`);

    const parsed = parseMarkdownFile(filePath);
    if (!parsed) {
      stats.errors.push(`Failed to parse: ${file}`);
      continue;
    }

    const validationErrors = validateFrontmatter(parsed.frontmatter, filePath);
    if (validationErrors.length > 0) {
      console.log(`  ✗ Validation failed:`);
      validationErrors.forEach((e) => console.log(`    - ${e}`));
      stats.errors.push(`Validation failed: ${file}`);
      continue;
    }

    const synced = await syncToDatabase(parsed);
    if (!synced) {
      stats.errors.push(`Sync failed: ${file}`);
      continue;
    }

    const newPath = moveToFolder(parsed);
    if (newPath) {
      console.log(`  ✓ Synced → moved to ${newPath.replace(CONTENT_DIR, "content")}`);
      manifest.files[parsed.frontmatter.slug] = {
        hash: parsed.hash,
        processedAt: new Date().toISOString(),
      };
      stats.processed++;
      stats.moved++;
    }
  }
}

/**
 * Process all files (for --all flag or detecting changes)
 */
async function processAll(stats: CompileStats, manifest: ProcessedManifest): Promise<void> {
  console.log("📂 Scanning all content folders for changes...\n");

  for (const [type, folder] of Object.entries(TYPE_FOLDERS)) {
    const folderPath = path.join(CONTENT_DIR, folder);
    if (!fs.existsSync(folderPath)) continue;

    const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".md") && f !== "README.md");

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const parsed = parseMarkdownFile(filePath);
      if (!parsed) continue;

      const slug = parsed.frontmatter.slug;
      const existing = manifest.files[slug];

      if (existing && existing.hash === parsed.hash) {
        stats.skipped++;
        continue;
      }

      console.log(`→ ${folder}/${file}${existing ? " (changed)" : " (new)"}`);

      const synced = await syncToDatabase(parsed);
      if (synced) {
        manifest.files[slug] = {
          hash: parsed.hash,
          processedAt: new Date().toISOString(),
        };
        stats.processed++;
        console.log(`  ✓ Synced`);
      } else {
        stats.errors.push(`Sync failed: ${folder}/${file}`);
      }
    }
  }
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const fullRecompile = args.includes("--all");

  console.log("\n🚀 Content Compiler\n" + "=".repeat(40) + "\n");

  const stats: CompileStats = { processed: 0, skipped: 0, moved: 0, errors: [] };
  const manifest = loadManifest();

  await processInbox(stats, manifest);

  if (fullRecompile || stats.processed === 0) {
    await processAll(stats, manifest);
  }

  saveManifest(manifest);

  console.log("\n" + "=".repeat(40));
  console.log("📊 Summary");
  console.log("=".repeat(40));
  console.log(`✓ Processed: ${stats.processed}`);
  console.log(`→ Moved:     ${stats.moved}`);
  console.log(`⊘ Skipped:   ${stats.skipped} (unchanged)`);

  if (stats.errors.length > 0) {
    console.log(`✗ Errors:    ${stats.errors.length}`);
    stats.errors.forEach((e) => console.log(`  - ${e}`));
  }

  console.log("\n✅ Done!\n");
  process.exit(stats.errors.length > 0 ? 1 : 0);
}

main();
