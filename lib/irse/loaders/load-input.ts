import type { SupabaseClient } from "@supabase/supabase-js";
import type { IrseInput } from "../inputs";
import type { PageKind } from "../types";
import { loadAreaIrseInput } from "./area";
import { loadBusinessIrseInput } from "./business";
import { loadCategoryIrseInput } from "./category";
import { loadGuideIrseInput } from "./guide";
import { loadTownIrseInput } from "./town";

export async function loadIrseInput(
  supabase: SupabaseClient,
  kind: PageKind,
  slug: string,
): Promise<IrseInput | null> {
  switch (kind) {
    case "business":
      return loadBusinessIrseInput(supabase, slug);
    case "guide":
      return loadGuideIrseInput(supabase, slug);
    case "town":
      return loadTownIrseInput(supabase, slug);
    case "area":
      return loadAreaIrseInput(supabase, slug);
    case "category":
      return loadCategoryIrseInput(supabase, slug);
  }
}
