/** Town “at a glance” facts stored on `public.towns`. */

export {
  AT_A_GLANCE_FACTS_SELECT as TOWN_FACTS_SELECT,
  highlightIcon,
  parseAtAGlanceFacts as parseTownFacts,
  type AtAGlanceFacts as TownFacts,
  type AtAGlanceFactsDetail as TownFactsDetail,
  type AtAGlanceFactsMetric as TownFactsMetric,
  type AtAGlanceFactsRow as TownFactsRow,
} from "@/lib/data/at-a-glance-facts";
