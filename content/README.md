# Content Directory

This is the markdown-first content source for WhereTo30A.

## Folder Structure

```
/content
  /towns          # Town pages (seaside.md, rosemary-beach.md)
  /beaches        # Beach pages (grayton-beach-state-park.md)
  /areas          # Shopping areas, districts (rosemary-beach-town-center.md)
  /businesses     # Business pages (amavida-coffee-rosemary.md)
  /guides         # Editorial guides (best-coffee-rosemary-beach.md)
  /seasonal       # Seasonal guides (summer-2026-30a.md)
```

## Frontmatter Schema

Every markdown file must include frontmatter with required and optional fields.

### Required Fields

```yaml
---
title: "Page Title"
type: guide | business | town | beach | area | seasonal
entity_type: guide | business | town | beach | area
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
