import { PlaceIntentNav, type PlaceIntentNavProps } from "@/components/place/PlaceIntentNav";
import { TownNavGate } from "@/components/feature-flags/TownNavGate";

type Props = PlaceIntentNavProps;

export function PlaceIntentNavSection(props: Props) {
  return (
    <TownNavGate>
      <PlaceIntentNav {...props} />
    </TownNavGate>
  );
}
