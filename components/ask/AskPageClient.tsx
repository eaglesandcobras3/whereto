"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ListBusinessTownOption } from "@/components/listing-request/ListBusinessForm";
import { ChatPanel } from "@/components/ask/ChatPanel";
import { ArtifactPanel } from "@/components/ask/ArtifactPanel";
import { SelectedBusinessDrawer } from "@/components/ask/SelectedBusinessDrawer";
import type { AskSearchDebug } from "@/lib/ask/search-debug";
import type { AskArtifact, ActiveFilters, BusinessResultCard } from "@/lib/ask/types";
import { buildFeedbackFormArtifact } from "@/lib/ask/artifacts";
import { isRichArtifact } from "@/lib/ask/artifact-rich-card";
import { cn } from "@/lib/utils";

type Props = {
  towns: ListBusinessTownOption[];
  sessionKey: string;
  initialQuery?: string;
};

export function AskPageClient({ towns, sessionKey, initialQuery }: Props) {
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [artifactSessionId, setArtifactSessionId] = useState<string | undefined>();
  const [artifact, setArtifact] = useState<AskArtifact | undefined>();
  const [shareableSummary, setShareableSummary] = useState<string | undefined>();
  const [selectedCard, setSelectedCard] = useState<BusinessResultCard | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refineQueue, setRefineQueue] = useState<string | null>(null);
  const [artifactPanelOpen, setArtifactPanelOpen] = useState(false);
  const [searchDebug, setSearchDebug] = useState<AskSearchDebug | undefined>();

  const businessCards = useMemo(() => {
    if (artifact?.type !== "business_results") return [];
    return artifact.results;
  }, [artifact]);

  const handleMetaUpdate = useCallback(
    (data: {
      conversationId?: string;
      artifactSessionId?: string;
      artifact?: AskArtifact | null;
      shareableArtifactSummary?: string;
      searchDebug?: AskSearchDebug | null;
    }) => {
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.artifactSessionId) setArtifactSessionId(data.artifactSessionId);
      if ("artifact" in data) {
        const next = data.artifact ?? undefined;
        setArtifact(next);
        if (next?.type === "clarification_form") {
          setArtifactPanelOpen(true);
        } else if (!next || !isRichArtifact(next)) {
          setArtifactPanelOpen(false);
        }
      }
      if (data.shareableArtifactSummary) setShareableSummary(data.shareableArtifactSummary);
      if ("searchDebug" in data) {
        setSearchDebug(data.searchDebug ?? undefined);
      }
    },
    [],
  );

  const openArtifactPanel = useCallback(() => {
    if (artifact && isRichArtifact(artifact)) {
      setArtifactPanelOpen(true);
    }
  }, [artifact]);

  const closeArtifactPanel = useCallback(() => {
    setArtifactPanelOpen(false);
  }, []);

  const onSelectBusiness = useCallback(
    (id: string) => {
      const card = businessCards.find((c) => c.id === id);
      if (card) {
        setSelectedCard(card);
        setDrawerOpen(true);
      }
    },
    [businessCards],
  );

  const onReportBusiness = useCallback(
    (id: string) => {
      const card = businessCards.find((c) => c.id === id);
      const next = buildFeedbackFormArtifact({
        businessId: id,
        listingContext: card ? `/business/${card.slug}` : undefined,
      });
      setArtifact(next);
      if (isRichArtifact(next)) setArtifactPanelOpen(true);
    },
    [businessCards],
  );

  const refineWithFilters = useCallback(
    (nextFilters: ActiveFilters) => {
      const parts: string[] = [];
      if (nextFilters.query) parts.push(nextFilters.query);
      if (nextFilters.town_or_area) parts.push(`near ${nextFilters.town_or_area}`);
      if (nextFilters.category) parts.push(nextFilters.category.replace(/_/g, " "));
      if (nextFilters.price_level) parts.push(`around price level ${nextFilters.price_level}`);
      for (const t of nextFilters.tags ?? []) parts.push(t);
      for (const d of nextFilters.dietary_tags ?? []) parts.push(d);
      setRefineQueue(
        parts.length > 0
          ? `Refine search: ${parts.join(", ")}`
          : "Show results again with current filters cleared",
      );
    },
    [],
  );

  const onRemoveFilter = useCallback(
    (key: keyof ActiveFilters) => {
      if (artifact?.type !== "business_results") return;
      const next = { ...artifact.activeFilters };
      delete next[key];
      setArtifact({ ...artifact, activeFilters: next });
      refineWithFilters(next);
    },
    [artifact, refineWithFilters],
  );

  const onClearFilters = useCallback(() => {
    if (artifact?.type !== "business_results") return;
    const next = { ...artifact, activeFilters: {} };
    setArtifact(next);
    refineWithFilters({});
  }, [artifact, refineWithFilters]);

  const onStartOver = useCallback(() => {
    setArtifact(undefined);
    setArtifactSessionId(undefined);
    setShareableSummary(undefined);
    setSelectedCard(null);
    setArtifactPanelOpen(false);
  }, []);

  const panelCallbacks = {
    artifact,
    artifactSessionId,
    shareableSummary,
    towns,
    onSelectBusiness,
    onReportBusiness,
    onRemoveFilter,
    onClearFilters,
    onRefine: (message: string) => {
      setRefineQueue(message);
      closeArtifactPanel();
    },
    onStartOver,
  };

  const showArtifactPanel = artifactPanelOpen && artifact && isRichArtifact(artifact);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background lg:h-[calc(100dvh-var(--site-header-offset))]">
      <ChatPanel
        sessionKey={sessionKey}
        conversationId={conversationId}
        artifactSessionId={artifactSessionId}
        onMetaUpdate={handleMetaUpdate}
        refineMessage={refineQueue}
        onRefineConsumed={() => setRefineQueue(null)}
        artifact={artifact}
        artifactPanelOpen={artifactPanelOpen}
        onOpenArtifactPanel={openArtifactPanel}
        searchDebug={searchDebug}
        initialQuery={initialQuery}
      />

      {showArtifactPanel ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:bg-black/10"
            aria-label="Close results"
            onClick={closeArtifactPanel}
          />
          <div
            className={cn(
              "fixed z-50 flex min-h-0 flex-col bg-background shadow-premium-lg",
              "inset-0 lg:inset-y-0 lg:left-auto lg:w-[min(100%,28rem)] lg:border-l lg:border-border xl:w-[32rem]",
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Recommendations"
          >
            <ArtifactPanel
              {...panelCallbacks}
              className="h-full"
              onClose={closeArtifactPanel}
              onStartOver={onStartOver}
            />
          </div>
        </>
      ) : null}

      <SelectedBusinessDrawer
        card={selectedCard}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onReport={(c) => onReportBusiness(c.id)}
      />
    </div>
  );
}
