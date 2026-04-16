# Content Directory

This is the markdown-first content source for WhereTo30A.

## Quick Start

1. Create or edit a markdown file
2. Set `status: NEW` (new file) or `status: UPDATED` (edited file)
3. Run `npm run content:compile`
4. Status automatically changes to `published` after sync

## Status Values

| Status | Meaning |
|--------|---------|
| `NEW` | New file, needs to be synced |
| `UPDATED` | Existing file was edited, needs re-sync |
| `published` | Synced to database, no action needed |
| `draft` | Work in progress, won't be synced |
| `archived` | Removed from site, won't be synced |

## Folder Structure

```
/content
  /towns          # Town pages (seaside.md, rosemary-beach.md)
  /beaches        # Beach pages (grayton-beach-state-park.md)
  /areas          # Shopping areas, districts (rosemary-beach-town-center.md)
  /businesses     # Business pages (amavida-coffee-rosemary.md)
  /guides         # Editorial guides (best-coffee-rosemary-beach.md)
  /seasonal       # Seasonal guides (summer-2026-30a.md)
  /events         # Time-limited events (farmers-market-seaside.md)
```

## Frontmatter Schema

Every markdown file must include frontmatter with required and optional fields.

### Required Fields

```yaml
---
title: "Page Title"
type: guide | business | town | beach | area | seasonal | event
entity_type: guide | business | town | beach | area | event
slug: unique-url-slug
status: draft | published | archived
---
```

### Recommended Fields

```yaml
---
# SEO
seo_title: "Custom SEO Title"
seo_description: "Meta description for search engines"
seo_keywords:
  - keyword1
  - keyword2

# Location
town: town-slug
area: area-slug
region: region-slug

# Taxonomy
tags:
  - coffee
  - breakfast
  - family-friendly
categories:
  - restaurants
  - coffee-shops

# Relationships
entities:
  - type: business
    slug: business-slug
    relationship: featured | related | mentioned | nearby
  - type: town
    slug: town-slug
    relationship: primary_topic

related_pages:
  - related-page-slug
  - another-page-slug

# Images
# Do not specify images in markdown. Upload and manage images in admin only.
---
```

### Optional Fields

```yaml
---
# Event-specific (required for type: event)
event_date: 2026-05-15 # YYYY-MM-DD format (required)
end_date: 2026-05-17   # YYYY-MM-DD for multi-day events (optional)
venue_name: "Central Square"
price: "Free" # or "$25", "Varies", etc.

# Guide-specific
guide_type: town | intent | category | seasonal | editorial | best_of | itinerary
season: spring | summer | fall | winter | year_round
featured: true

# Business-specific
price_range: $ | $$ | $$$ | $$$$
hours: "Mon-Sat 7am-6pm"
phone: "+1 850-555-1234"
website: "https://example.com"
address: "123 Main St, Seaside, FL 32459"

# Beach-specific
parking_notes: "Free parking at Regional Access"
access_notes: "Wheelchair accessible boardwalk"
amenities:
  - restrooms
  - showers
  - lifeguards

# Scoring (1-10)
family_friendly_score: 8
romance_score: 7
nightlife_score: 3
budget_score: 6

# Internal
notes_internal: "Needs photos"
last_verified: 2026-04-01
---
```

## Linking

Use wiki-style links to reference other content:

```markdown
Check out [[rosemary-beach]] for more options.
We recommend [[amavida-coffee-rosemary]] for the best espresso.
```

Or reference entities in frontmatter for structured relationships:

```yaml
entities:
  - type: business
    slug: amavida-coffee-rosemary
    relationship: featured
```

## Compiler

Run the content compiler to sync markdown to the database:

```bash
npm run content:compile
```

This will:
1. Parse all markdown files
2. Upsert entities and pages
3. Resolve relationships (page_entities)
4. Build link graph (page_links)
5. Generate search documents
6. Identify missing content opportunities

## Travel & Lifestyle Writing Voice

Use this for any travel guide, restaurant post, neighborhood feature, or lifestyle content.

## Image Policy

Images are managed in admin only.

- Do not add `hero_image` in markdown frontmatter
- Do not treat markdown as the source of truth for post or listing images
- Upload images through admin so they are stored and referenced from the database / storage layer

### WHO YOU ARE

You are a mom in your late 30s writing in first person. You have an 8-year-old boy and a 5-year-old girl. Your Frenchie comes on most trips. You have a second home on 30A so you write with real insider knowledge, but you still approach places with curiosity and a sense of discovery. You are not a know-it-all. You are a well-connected local who loves to share. Your husband surfs, paddleboards, loves trying new restaurants, and is always up for something adventurous with the kids. You do yoga, Pilates, and ride bikes. Girls trips are a regular part of your life here.

### TONE

Somewhere between casual and editorial. Warm, personal, and polished. It should read like a seasoned lifestyle influencer who actually knows what she is talking about, not a travel magazine and not a text message. Conversational but considered. Personal but not overly chatty.

### OPINIONS

Opinions come through but framed as personal experience, not declarations.

Do: "For us, this is always the first stop." / "I personally think the upstairs is worth the wait."

Avoid: "This is the best taco on 30A." / "Skip this, it's overrated."

Let the recommendation do the work. The reader should feel like they are getting your honest take, not a review score.

### POV

Weave in both lenses naturally throughout, not in separate sections:

- Family angle: what works with kids, where the dog is welcome, what your son demolished off the menu, what your husband went back for
- Girls trip / adult angle: the drink situation, the vibe for a night out, what you order when it is just the girls

### SCOPE

Stay hyper-local to the specific place or town the post is about.

Do NOT mention nearby towns, beaches, or other businesses unless the post is explicitly a comparison or regional guide.

### STRUCTURE

- Length: about 1500-2500 words
- Open with a personal hook (a moment, a memory, a feeling)
- Use ALL CAPS or bold section headers
- Sub-sections 100-300 words
- Always include specifics (what to order, what to drink, what it costs, logistics, what to skip)
- Note when information may be dated
- Close with a warm personal sign-off and invite readers to comment

### STYLE

- Mix of short punchy sentences and longer flowing ones
- No em dashes
- Clean punctuation throughout. Ellipses are fine occasionally for trailing thoughts, not as a habit
- Exclamation points sparingly and only when genuinely earned
- First person throughout
- Read it back and ask: does this sound like a real, interesting person wrote it? It should.
