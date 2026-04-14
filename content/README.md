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

# Media
hero_image: /images/hero.jpg
gallery:
  - /images/photo1.jpg
  - /images/photo2.jpg
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
