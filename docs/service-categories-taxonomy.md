# Service vendor taxonomy (Specialties)

**Status:** Living document — expand as new vendor types appear. Code source of truth: `lib/service-categories/constants.ts` + Supabase `service_categories`.

## Two different “category” systems

| System | Table / field | Used for | Example slugs |
|--------|----------------|----------|----------------|
| **Storefront browse** | `business_categories` → `primary_category_id` | Places you visit: eat, shop, drink | `restaurants`, `shopping`, `bars`, `services` |
| **Service specialty** | `service_categories` → `service_category_id` | Providers you hire, book, or call | `hvac`, `insurance`, `legal` |

A listing can be `is_service_business=true` with a specialty on `service_category_id`.
Do **not** use the storefront catch-all slug `services` for new service vendors — it is
legacy/search-only and does not power footer or hub browse groups.

### Free intake (`/list-your-business`)

- **Physical location** → `is_storefront` + `primary_category_id` (`business_categories`)
- **No fixed location / by appointment** → `is_service_business` + `service_category_id` (`service_categories`)

Service intakes must collect a specialty (e.g. `legal`, `insurance`, `accounting`). That is what
makes the listing appear under Services footer links and the `/services` Professional & financial
(and other) dropdowns. A storefront category like `professional_services` alone does **not**.

## When `is_service_business` should be true

**Yes — regional / appointment / B2B providers:**

- Trades (HVAC, plumbing, roofing, pest, cleaning, landscaping)
- Professional offices (law, CPA, insurance, title, wealth)
- Medical / dental / counseling / vet (clinic practices, not hospital campuses as attractions)
- Vacation rental managers, property managers, home inspectors
- Marine service, charters, watersports operators
- Event vendors (photography, catering, DJs), marketing/IT agencies
- Auto repair, towing, limo/car service
- Storage, dumpster, septic, portable toilet vendors

**No — keep as storefront (`is_service_business=false`):**

- Restaurants, bars, coffee shops, bakeries, wineries (use `restaurants` / `bars` / `coffee_shops`)
- Hotels, resorts, golf courses, family attractions (use `activities` or dedicated hospitality handling)
- Retail shops (boutiques, hardware, furniture, grocery) — use `shopping`
- Schools, hospitals as destination venues (unless the row is clearly a **local clinic practice**)

The import script (`scripts/import-services-csv.ts`) rejects obvious storefronts; the **audit script** flags rows that slipped through.

## Specialty groups (hub / search sections)

| Group slug | Label | Specialty slugs |
|------------|-------|-----------------|
| `outdoor_property` | Outdoor & property | `landscaping`, `lawn_care`, `pool_spa`, `irrigation`, `pest_control`, `property_management`, `vacation_rentals`, `home_staging` |
| `home_trades` | Home trades | `plumbing`, `electrical`, `hvac`, `painting`, `handyman`, `roofing`, `cleaning`, `pressure_washing`, `junk_removal`, `moving`, `flooring`, `concrete_masonry`, `home_exterior`, `appliance_repair`, `solar_energy`, `restoration`, `contractors`, `home_improvement`, `home_inspection`, `security_systems` |
| `marine` | Marine | `marine_boat` |
| `professional` | Professional & financial | `insurance`, `accounting`, `legal`, `real_estate`, `financial`, `staffing`, `engineering_survey` |
| `health_wellness` | Health & wellness | `health_medical`, `counseling`, `veterinary`, `salon_spa`, `fitness_wellness` |
| `creative_events` | Creative & events | `design_architecture`, `photography`, `events_wedding`, `catering_events`, `marketing_creative` |
| `tech_office` | Tech & workspace | `it_computer`, `office_workspace` |
| `auto_transport` | Auto & transport | `auto_repair`, `towing_transport`, `car_rental` |
| `family_pets` | Family, pets & education | `education_childcare`, `pet_services` |
| `other_services` | Other services | `storage`, `waste_septic`, `laundry_dry_clean` |

## Complete specialty slug list (56)

Each slug is mutually exclusive per listing (pick the **best single fit**). Classification guide strings live in `SERVICE_CATEGORY_CLASSIFICATION_GUIDE` in code.

### Outdoor & property

| Slug | Label | Examples |
|------|-------|----------|
| `landscaping` | Landscaping | BrightView, landscape design, planting |
| `lawn_care` | Lawn care | Mowing-only, fertilizing |
| `pool_spa` | Pool & spa | Pool clean/repair, spa service |
| `irrigation` | Irrigation | Sprinkler install/repair |
| `pest_control` | Pest control | Exterminators, termite |
| `property_management` | Property management | HOA, long-term rental managers |
| `vacation_rentals` | Vacation rentals | STR managers, rental agencies |
| `home_staging` | Home staging | Staging for sale/rental |

### Home trades

| Slug | Label | Examples |
|------|-------|----------|
| `plumbing` | Plumbing | Plumbers, drain, water heaters |
| `electrical` | Electrical | Electricians, panels, lighting |
| `hvac` | HVAC | AC, heat, mechanical combos |
| `painting` | Painting | House painters |
| `handyman` | Handyman | Small repairs |
| `roofing` | Roofing | Roofers |
| `cleaning` | Cleaning | Maid, janitorial, deep clean |
| `pressure_washing` | Pressure washing | Soft wash, driveways |
| `junk_removal` | Junk removal | Haul-away, debris (not full moves) |
| `moving` | Moving & hauling | Movers, large haul |
| `flooring` | Flooring | Tile, hardwood, garage epoxy |
| `concrete_masonry` | Concrete & masonry | Driveways, retaining walls |
| `home_exterior` | Exterior & openings | Windows, doors, gutters, fencing |
| `appliance_repair` | Appliance repair | Appliance service |
| `solar_energy` | Solar & energy | Solar install, generators |
| `restoration` | Restoration | Fire/water/mold restoration |
| `contractors` | Contractors | GC, remodel, builder networks |
| `home_improvement` | Home improvement | Cabinets, closets, counters, blinds |
| `home_inspection` | Home inspection | Pre-purchase inspectors |
| `security_systems` | Security systems | Alarms, monitoring |

### Marine

| Slug | Label | Examples |
|------|-------|----------|
| `marine_boat` | Marine & boat | Boat yard, charters, watersports rentals |

### Professional & financial

| Slug | Label | Examples |
|------|-------|----------|
| `insurance` | Insurance | Allstate, Farm Bureau, agencies |
| `accounting` | Accounting & tax | CPA, bookkeeping, payroll |
| `legal` | Legal | Attorneys, PLLC |
| `real_estate` | Real estate & title | Realtors, title, escrow |
| `financial` | Financial advisory | Wealth, RIAs |
| `staffing` | Staffing & recruiting | Employment agencies |
| `engineering_survey` | Engineering & survey | A&E firms, civil, surveyors |

### Health & wellness

| Slug | Label | Examples |
|------|-------|----------|
| `health_medical` | Health & medical | Dental, derm, clinics, rehab, hospice |
| `counseling` | Counseling | Therapy, mental health |
| `veterinary` | Veterinary | Vet clinics |
| `salon_spa` | Salon & spa | Hair, nails, day spa, med spa |
| `fitness_wellness` | Fitness & wellness | Pilates, yoga, personal training |

### Creative & events

| Slug | Label | Examples |
|------|-------|----------|
| `design_architecture` | Design & architecture | Interior design, architects |
| `photography` | Photography | Portrait, real estate photo |
| `events_wedding` | Events & weddings | Planners, florists, DJs |
| `catering_events` | Event catering | Catering (not sit-down restaurant) |
| `marketing_creative` | Marketing & creative | Agencies, print/signage |

### Tech & workspace

| Slug | Label | Examples |
|------|-------|----------|
| `it_computer` | IT & computers | MSP, repair, web dev |
| `office_workspace` | Office & workspace | Coworking, flex space |

### Auto & transport

| Slug | Label | Examples |
|------|-------|----------|
| `auto_repair` | Auto repair | Mechanics, body shops |
| `towing_transport` | Towing & transport | Tow, limo, private car |
| `car_rental` | Car rental | Rental car agencies |

### Family, pets & education

| Slug | Label | Examples |
|------|-------|----------|
| `education_childcare` | Education & childcare | Daycare, tutoring, lessons |
| `pet_services` | Pet services | Grooming, boarding, training |

### Other services

| Slug | Label | Examples |
|------|-------|----------|
| `storage` | Storage | Self-storage |
| `waste_septic` | Waste & septic | Septic, dumpsters, portable toilets |
| `laundry_dry_clean` | Laundry & dry clean | Dry cleaners, laundromats |

## Source CSV → specialty hints

From `docs/services.csv` **category** column (import metadata — not DB specialty):

| CSV category | Typical specialties |
|--------------|---------------------|
| Home Repair & Trades | `hvac`, `plumbing`, `handyman`, `home_improvement`, … |
| Professional, Financial & Legal | `financial`, `insurance`, `accounting`, `legal`, `real_estate` |
| Health, Beauty & Wellness | `health_medical`, `counseling`, `salon_spa`, `fitness_wellness` |
| Tourist & Vacation Services | Often **mis-imported** — use `vacation_rentals`, `marine_boat`, or re-flag as storefront |
| Retail, Errands & Local Convenience | Usually **storefront** `shopping`, not a specialty |
| Food, Events & Hospitality | Usually **storefront** `restaurants` / `bars` |

## Operator workflow

1. Apply migrations through `20260604130400_service_categories_full_taxonomy.sql`
2. Audit: `npx tsx scripts/audit-service-vendors.ts` → `docs/service-vendor-audit-report.md`
3. Fix flags: set `is_service_business=false` for mis-tagged storefronts (audit section **Mis-tagged storefront patterns**)
4. Classify: `npx tsx scripts/classify-service-categories.ts --dry-run --reclassify`
5. Apply: `npx tsx scripts/classify-service-categories.ts --apply --reclassify`
6. Re-audit until unclassified service vendors are near zero

## Future additions (add slug + migration + constants together)

Consider when data appears:

- `funeral` — funeral homes
- `church` — only if listing faith organizations as vendors
- `government` — permits/licenses offices (usually not directory vendors)
- `telecom` — ISP / phone installers
- `medical_equipment` — DME suppliers
- `inspection_environmental` — environmental testing (separate from home inspection)

**Never add** a catch-all `other` — leave `service_category_id` null and fix taxonomy or `is_service_business` instead.
