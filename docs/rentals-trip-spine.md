# Trip-planning spine (Phase 6+)

Shared trip context for marketplace expansion — **not built in MVP**.

## Flow

```
Rental search → Trip dates and town → Direct booking click → Saved trip → Events, experiences, services
```

## Shared interface

See [`lib/stays/trip-context.ts`](../lib/stays/trip-context.ts):

- `TripContext` — town + check-in/out + guests
- `MarketplaceSearchDocument` — cross-category search projection

## Rules

- Do **not** merge rentals, experiences, services, and events into one oversized table.
- Keep separate transactional/scheduling tables; share search documents or trip context where useful.
- Organic rankings stay separate from paid featuring.
- Property guest reviews require verified stays (native booking or partner confirmation) — out of scope until then.
