import { AtAGlanceSection } from "@/components/place/AtAGlanceSection";
import type { TownFacts } from "@/lib/data/town-facts";

type Props = {
  townName: string;
  facts: TownFacts;
};

/** Town profile “at a glance” — metrics, highlights, detail cards, and disclaimer. */
export function TownAtAGlanceSection({ townName, facts }: Props) {
  return (
    <AtAGlanceSection placeName={townName} facts={facts} idPrefix="town-at-a-glance" />
  );
}
