# WhereTo30A Design Language System (DLS)

An Airbnb-inspired design language adapted for 30A — generous whitespace, photo-first layouts, and modest typography — while preserving the Emerald Coast brand palette.

## Philosophy

We adopt Airbnb DLS principles without copying their brand:

| Principle | WhereTo30A execution |
|-----------|---------------------|
| **Unified** | One meaning for Card, Row, and Section across discovery, browse, and Ask surfaces. Tokens in `app/globals.css` are the single source of truth. |
| **Universal** | 48px touch targets, semantic color contrast, responsive containers with fluid gutters. |
| **Iconic** | Photography and whitespace carry hierarchy; type stays restrained (500–600 weights on display). |
| **Conversational** | Pill search, soft hover lifts, and row-based lists guide discovery without visual noise. |

### Component autonomy (not Atomic Design)

Components are **organisms** with required and optional slots — they can be composed or removed independently:

- **Row** — leading icon/image, title, subtitle, trailing action
- **Listing card** — photo plate, title, meta, actions (no divider lines)
- **Section** — eyebrow, display headline, body, content grid

### The Row strategy

Most list UIs should use `Row` / `.dls-row` rather than bespoke table markup. Standardize text, icons, and hairlines inside a single row cell so pages scale quickly.

---

## Brand colors (preserved)

Do **not** swap to Airbnb Rausch. Keep the coastal team palette:

| Token | Value | Role |
|-------|-------|------|
| `--color-primary` | `#003239` | Primary CTA, ink accents |
| `--color-primary-light` | `#004b54` | Hover / active |
| `--color-logo-teal` | `#6cb2b5` | Hero accent CTA |
| `--color-logo-navy` | `#1c3257` | Nav active states |
| `--color-background` | `#faf9f8` | Page canvas (sand) |
| `--color-surface` | `#ffffff` | Cards, panels |
| `--color-text-primary` | `#1a1c1c` | Ink (never pure black) |

Semantic aliases for DLS patterns:

| DLS alias | Maps to |
|-----------|---------|
| `--color-canvas` | `--color-surface` |
| `--color-ink` | `--color-text-primary` |
| `--color-body` | `--color-text-secondary` |
| `--color-muted` | `--color-text-tertiary` |
| `--color-hairline` | Ghost divider tone |
| `--color-border-ghost` | 15% outline-variant (accessibility fallback only) |

---

## Typography

**Fonts:** Manrope (display) + Inter (body) — our Cereal equivalent. Inter substitutes cleanly when Manrope is unavailable.

Display weights stay **modest** (500–600). Photography carries visual weight, not 800-weight headlines.

| Class | Size | Weight | Use |
|-------|------|--------|-----|
| `.text-display-xl` | 28–32px | 600 | Section heroes, homepage bands |
| `.text-display-lg` | 22px | 500 | Listing / town detail titles |
| `.text-display-md` | 20px | 600 | In-page section heads |
| `.text-title-md` | 16px | 600 | Card titles, city names |
| `.text-body-md` | 16px | 400 | Running copy |
| `.text-body-sm` | 14px | 400 | Card meta, dates |
| `.text-caption` | 14px | 500 | Labels above fields |

Legacy classes (`.text-hero`, `.text-editorial-headline`) remain but now render at lighter weights for DLS alignment.

---

## Spacing & layout

4px base grid with **premium section rhythm** (more generous than marketplace-dense Airbnb):

| Token | Value | Use |
|-------|-------|-----|
| `--space-base` | 16px | Card gutters, row gaps |
| `--space-lg` | 24px | Card internal padding |
| `--space-xl` | 32px | Grid gaps (desktop) |
| `--space-xxl` | 48px | Section header → content |
| `--space-section-lg` | 80px | Section padding (mobile) |
| `--space-section-xl` | 96px | Section padding (desktop) |

### Layout utilities

| Class | Purpose |
|-------|---------|
| `.dls-container` | Max 1280px, fluid gutters |
| `.dls-section` | Vertical section padding |
| `.dls-section-header` | Eyebrow + title + subtitle block |
| `.dls-grid-cards` | Responsive card grid with generous gap |

---

## Elevation

One shadow tier — depth from photos and surface nesting, not stacked shadows:

```css
--shadow-float: hairline ring + soft ambient lift (primary-tinted)
```

Apply on hover for listing cards and dropdowns. Default state is **flat**.

---

## Components

### Buttons

| Pattern | Implementation |
|---------|----------------|
| Primary | `btn-primary` or `<Button variant="premium" size="xl">` — gradient CTA, pill shape, 48px |
| Secondary | Ghost border, 8px radius |
| Tertiary | Text only, underline on hover |

### Search

- Height: `--search-height` (56px)
- Shape: full pill (`rounded-full`)
- Terminator: circular primary orb (see `SearchBar` hero-intent variant)

### Listing card

```html
<article class="listing-card">
  <div class="listing-card-photo">…</div>
  <div class="listing-card-body">
    <h3 class="text-listing-title">…</h3>
    <p class="text-listing-meta">…</p>
  </div>
</article>
```

Or `<Card variant="listing">` from `components/ui/card.tsx`.

**No divider lines** between photo and meta — use `--space-md` gap only.

### Row

```tsx
import { Row, RowGroup } from "@/components/ui/row"

<RowGroup>
  <Row first leading={<Icon />} title="Beach access" subtitle="0.2 mi" trailing={<Chevron />} />
</RowGroup>
```

---

## Migration checklist

When touching a surface, prefer:

1. `dls-container` / `dls-section` over hardcoded `py-20 max-w-*`
2. Design tokens over `zinc-*` / `stone-*` Tailwind neutrals
3. `--color-border-ghost` over opaque borders
4. `.text-display-*` over heavy `font-extrabold` headings
5. `listing-card` / `Card variant="listing"` for photo-first tiles

---

## Reference

- Implementation: [`app/globals.css`](../app/globals.css)
- Coastal editorial spec: [`design/emerald_horizon/DESIGN.md`](emerald_horizon/DESIGN.md)
- Airbnb analysis (reference only): uploaded design brief — colors intentionally **not** adopted
