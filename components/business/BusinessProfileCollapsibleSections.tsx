"use client";

import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { usePersistedExpandedSectionIds } from "@/lib/hooks/use-persisted-expanded-section-ids";
import { markdownSectionPreview } from "@/lib/markdown/section-meta";

const SECTION_IDS = {
  vibe: "vibe",
  about: "about",
  localTip: "local-tip",
  whoItsFor: "who-its-for",
} as const;

type Props = {
  vibe?: string[] | null;
  aboutSummary?: string | null;
  showAbout?: boolean;
  localTip?: string | null;
  goodFor?: string[] | null;
  notIdealFor?: string[] | null;
};

function visibleSectionIds({
  vibe,
  aboutSummary,
  showAbout,
  localTip,
  goodFor,
  notIdealFor,
}: Props): string[] {
  const ids: string[] = [];
  if (vibe?.length) ids.push(SECTION_IDS.vibe);
  if (showAbout && aboutSummary) ids.push(SECTION_IDS.about);
  if (localTip) ids.push(SECTION_IDS.localTip);
  if (goodFor?.length || notIdealFor?.length) ids.push(SECTION_IDS.whoItsFor);
  return ids;
}

export function BusinessProfileCollapsibleSections(props: Props) {
  const sectionIds = visibleSectionIds(props);
  const { expandedIds, setExpanded } = usePersistedExpandedSectionIds({
    sectionIds,
    storageScope: "cards",
  });

  const { vibe, aboutSummary, showAbout, localTip, goodFor, notIdealFor } = props;

  return (
    <>
      {vibe?.length ? (
        <CollapsibleSection
          icon="spa"
          headingLevel={2}
          preview={`${vibe.slice(0, 3).join(" · ")}${vibe.length > 3 ? " · …" : ""}`}
          title="The Vibe"
          open={expandedIds.has(SECTION_IDS.vibe)}
          onOpenChange={(open) => setExpanded(SECTION_IDS.vibe, open)}
        >
          <div className="flex flex-wrap gap-2">
            {vibe.map((v) => (
              <span key={v} className="editorial-chip">
                {v}
              </span>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}

      {showAbout && aboutSummary ? (
        <CollapsibleSection
          icon="storefront"
          headingLevel={2}
          preview={markdownSectionPreview(aboutSummary, 150)}
          title="About"
          open={expandedIds.has(SECTION_IDS.about)}
          onOpenChange={(open) => setExpanded(SECTION_IDS.about, open)}
        >
          <p className="text-base leading-relaxed text-zinc-700 sm:text-lg">{aboutSummary}</p>
        </CollapsibleSection>
      ) : null}

      {localTip ? (
        <CollapsibleSection
          icon="lightbulb"
          headingLevel={2}
          preview={markdownSectionPreview(localTip, 120)}
          title="Local tip"
          open={expandedIds.has(SECTION_IDS.localTip)}
          onOpenChange={(open) => setExpanded(SECTION_IDS.localTip, open)}
        >
          <div className="pull-quote border-0 p-0">
            <p className="text-base leading-relaxed sm:text-lg">{localTip}</p>
          </div>
        </CollapsibleSection>
      ) : null}

      {goodFor?.length || notIdealFor?.length ? (
        <CollapsibleSection
          icon="groups"
          headingLevel={2}
          preview={[
            goodFor?.length ? `Great for ${goodFor.slice(0, 2).join(", ")}` : null,
            notIdealFor?.length ? `Skip if ${notIdealFor.slice(0, 2).join(", ")}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          title="Who it's for"
          open={expandedIds.has(SECTION_IDS.whoItsFor)}
          onOpenChange={(open) => setExpanded(SECTION_IDS.whoItsFor, open)}
        >
          <div className="grid gap-8 sm:grid-cols-2">
            {goodFor?.length ? (
              <div>
                <h3 className="text-eyebrow mb-4">Great for</h3>
                <ul className="space-y-2.5">
                  {goodFor.map((g) => (
                    <li key={g} className="flex items-center gap-2.5 text-zinc-700">
                      <span className="material-symbols-outlined !text-base text-green-600">
                        check_circle
                      </span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {notIdealFor?.length ? (
              <div>
                <h3 className="text-eyebrow mb-4">Skip if</h3>
                <ul className="space-y-2.5">
                  {notIdealFor.map((n) => (
                    <li key={n} className="flex items-center gap-2.5 text-zinc-500">
                      <span className="material-symbols-outlined !text-base text-zinc-300">
                        remove_circle
                      </span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </CollapsibleSection>
      ) : null}
    </>
  );
}
