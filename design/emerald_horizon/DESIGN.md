# Design System Document

## 1. Overview & Creative North Star

### The Creative North Star: "The Digital Concierge"
This design system is not a utility; it is a curated editorial experience. It captures the essence of Florida’s Scenic Highway 30A by blending the **functional density of early Airbnb** with the **immersion of modern Apple interfaces**. We move beyond the "template" look by treating the screen as a physical space—where intentional asymmetry, high-resolution lifestyle photography, and expansive whitespace create a feeling of luxury and breathability.

**Core Philosophy:**
- **Editorial Intent:** Use drastic scale shifts in typography to guide the eye, moving away from rigid, blocky layouts toward a fluid, storytelling approach.
- **Atmospheric Depth:** The interface should feel like light passing through shallow emerald water. Use glassmorphism and tonal shifts rather than lines to define the architecture.
- **AI-Forward Elegance:** Sophisticated search interfaces and "suggested" states use soft glows and subtle gradients to signal intelligence without cluttering the "Coastal Premium" aesthetic.

---

## 2. Colors: The Emerald Coast Palette

The palette is rooted in the natural tones of 30A: crisp architectural whites, the deep teals of the Gulf, and the soft sand of the dunes.

### The "No-Line" Rule
**Explicit Instruction:** Use of 1px solid borders for sectioning or containment is prohibited. Structural boundaries must be defined solely through:
1. **Background Shifts:** A `surface-container-low` card sitting on a `surface` background.
2. **Tonal Transitions:** Using subtle value changes to imply a change in context.
3. **Negative Space:** Relying on the spacing scale to separate ideas.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use a "Nesting" principle to create depth:
- **Base Layer:** `surface` (#faf9f8) - The foundational canvas.
- **Secondary Layer:** `surface-container-low` (#f4f3f2) - For large grouping areas.
- **Component Layer:** `surface-container-lowest` (#ffffff) - For primary cards and elevated content.
- **Highlight Layer:** `surface-bright` (#faf9f8) - For interactive focus states.

### The "Glass & Gradient" Rule
To achieve a high-tech feel, use **Glassmorphism** for floating elements (e.g., sticky headers, floating search bars). 
- **Style:** Apply `surface` color at 70% opacity with a `20px` backdrop-blur.
- **Gradients:** Use a subtle linear gradient from `primary` (#003239) to `primary-container` (#004b54) for main CTAs to provide a "living" depth that flat colors lack.

---

## 3. Typography: Sophisticated Contrast

We utilize a dual-font strategy to balance human-centric discovery with technical precision.

- **Display & Headlines (Manrope):** Chosen for its geometric but warm character. Use `display-lg` for hero moments with tight tracking (-2%) to mimic high-end travel magazines.
- **Body & Titles (Inter):** The workhorse for density. Its neutrality provides the "Apple-esque" clarity required for complex search results and list views.

**Hierarchy as Identity:**
- **The "Hero" Scale:** Use `display-lg` for town names (e.g., "Alys Beach") to create an immediate editorial impact.
- **The "Functional" Scale:** Use `label-md` in all-caps with 0.05em letter spacing for metadata (e.g., "DISTANCE", "PRICE POINT") to evoke a premium, technical feel.

---

## 4. Elevation & Depth

We convey importance through **Tonal Layering** rather than heavy shadows or lines.

### The Layering Principle
Depth is achieved by stacking tiers. Place a `surface-container-lowest` (#ffffff) card on a `surface-container` (#eeeeed) background to create a soft, natural lift.

### Ambient Shadows
When a "floating" effect is required (like a persistent search bar or a featured property card):
- **Shadow Spec:** Blur: `40px`, Spread: `0px`, Opacity: `6%`.
- **Shadow Color:** Use a tinted version of `primary` (a deep navy-teal) rather than neutral grey. This mimics natural ambient light reflecting the coastal environment.

### The "Ghost Border" Fallback
If a border is required for accessibility, it must be a **Ghost Border**:
- Use `outline-variant` (#bfc8c9) at **15% opacity**. 100% opaque borders are strictly forbidden as they "trap" the content and break the coastal flow.

---

## 5. Components

### Cards & Discovery Lists
- **Rule:** No divider lines.
- **Style:** Images use `roundedness-lg` (1rem). Content is separated from the image by `1.5rem` of vertical whitespace. 
- **Elevation:** Use the Layering Principle (white card on a soft sand background).

### Minimal Search Interface
- **Style:** A single, high-height (56px) input field using `surface-container-highest`. 
- **Interaction:** On focus, the field expands slightly with a subtle `primary` glow (8px blur, 10% opacity) to signal the AI-forward search capability.

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`), white text, `roundedness-full`.
- **Secondary:** Glassmorphic (`surface` at 20% opacity), `outline-variant` Ghost Border.
- **Tertiary:** No background, `primary` text, underlined only on hover.

### Filter Chips
- **Style:** `surface-container-low` background, `roundedness-full`, `body-sm` typography. 
- **Selected State:** Background shifts to `primary`, text to `on-primary`.

---

## 6. Do's and Don'ts

### Do
- **Do** use asymmetrical layouts where one column of cards is slightly offset from the other to create a "scrolled gallery" feel.
- **Do** prioritize high-resolution photography; the UI should act as a frame for the beauty of 30A.
- **Do** use `1.5rem` (xl) or `2rem` padding for containers to ensure the content feels "premium."

### Don't
- **Don't** use pure black (#000000). Use `on-surface` (#1a1c1c) for text to maintain a softer, organic feel.
- **Don't** use standard 1px borders to separate list items; use white space or the `surface-variant` color shift.
- **Don't** clutter the view with icons. If an icon is used, it must be a thin-weight (200-300) stroke icon to match the typography's elegance.
- **Don't** use sharp corners. Every interactive element must utilize the `roundedness` scale, specifically `md` (0.75rem) or higher.