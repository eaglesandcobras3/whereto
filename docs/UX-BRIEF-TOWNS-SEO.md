# UX Design Brief — WhereTo30A + Towns + SEO

**For designers and frontend engineers.** **WhereTo30A** (`whereto30a`): AI-powered local discovery with curated browsing, location-aware hubs, and SEO landing pages. **Not** a noisy directory or review site.

**Product docs:** [PRD-SEO-TOWNS.md](./PRD-SEO-TOWNS.md)  
**Engineering:** [TDD-SEO-TOWNS.md](./TDD-SEO-TOWNS.md)

---

## Principles

1. **Guided, not overwhelming** — lead to decisions; avoid endless lists.
2. **Minimal and editorial** — typography, spacing, restraint.
3. **AI-first entry, structured fallback** — search feels conversational; browsing always works.
4. **Trust over noise** — summaries, tags, saves; **no prominent star ratings** on consumer surfaces (see PRD display policy).
5. **Consistency** — home, town, and SEO pages share components and visual language.

## Inspiration

Airbnb-style cards and scroll; Apple-like simplicity; editorial travel tone. **Avoid:** Yelp density, heavy filters, uniform dense grids.

## Reusable components (target)

| Component | Role |
|-----------|------|
| `SearchBar` | AI entry; context-aware placeholder on town pages |
| `BusinessCard` | Name, 1–2 line summary, tags, save; **public variant hides ratings** |
| `RecommendationCarousel` | Horizontal scroll of cards |
| `CategoryGrid` | Category tiles |
| `TownCard` | Town image + descriptor → town hub |
| `SectionBlock` | Titled section + optional “see all” |
| `TagPills` | Tag display |
| `SaveButton` | Save / auth redirect |

Implementation lives under [`components/`](../components/) (e.g. `components/discovery/*`).

## Homepage (region hub)

- Hero + large search (“Ask anything about 30A…” — WhereTo30A)
- Quick nav: categories + towns
- Featured carousels (popular, restaurants, coffee, things to do)
- Suggested AI prompts
- Town grid
- Short footer copy + internal links

## Town page

- Hero: town name, one-line intro, contextual search
- Top picks carousel
- Intent sections (coffee, lunch, date night, kid-friendly, …) — carousels
- **Nearby:** “Worth the short drive” — adjacent towns, labeled
- Category grid
- AI prompt block
- Supporting editorial blurb

## SEO / intent page

- SEO title + intro
- Top 5–10 recommendations (cards)
- Related intents, nearby towns, tips
- Strong internal links

## Interaction

- Primary: search, save, open business, scroll sections
- Lightweight feedback (helpful / not for me / bad experience — private)

## Visual direction

Black/white base, soft coastal accents, large type, minimal borders, subtle motion only.

## Mobile

Stacked sections, horizontal carousels, sticky search where appropriate, thumb-friendly targets.

## Deliverables for design

Home, town, and SEO page (desktop + mobile), component library, loading/empty/hover states.

## Goal

Feel like a **trusted local guide** — “I don’t need to search anywhere else.”
