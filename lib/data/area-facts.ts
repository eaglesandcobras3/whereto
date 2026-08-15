/** Area “at a glance” facts stored on `public.areas` (PostHog `area_facts`). */

export {
  AT_A_GLANCE_FACTS_SELECT as AREA_FACTS_SELECT,
  highlightIcon,
  parseAtAGlanceFacts as parseAreaFacts,
  type AtAGlanceFacts as AreaFacts,
  type AtAGlanceFactsDetail as AreaFactsDetail,
  type AtAGlanceFactsMetric as AreaFactsMetric,
  type AtAGlanceFactsRow as AreaFactsRow,
} from "@/lib/data/at-a-glance-facts";
