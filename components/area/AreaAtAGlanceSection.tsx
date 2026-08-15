import { AtAGlanceSection } from "@/components/place/AtAGlanceSection";
import type { AreaFacts } from "@/lib/data/area-facts";

type Props = {
  areaName: string;
  facts: AreaFacts;
};

/** Area profile “at a glance” — metrics, highlights, detail cards, and disclaimer. */
export function AreaAtAGlanceSection({ areaName, facts }: Props) {
  return (
    <AtAGlanceSection placeName={areaName} facts={facts} idPrefix="area-at-a-glance" />
  );
}
