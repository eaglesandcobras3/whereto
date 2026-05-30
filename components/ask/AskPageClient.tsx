"use client";

import { useCallback, useMemo, useState } from "react";
import type { ListBusinessTownOption } from "@/components/listing-request/ListBusinessForm";
import { ChatPanel } from "@/components/ask/ChatPanel";
import { ArtifactPanel } from "@/components/ask/ArtifactPanel";
import { SelectedBusinessDrawer } from "@/components/ask/SelectedBusinessDrawer";
import { Separator } from "@/components/ui/separator";
import type { AskArtifact, ActiveFilters, BusinessResultCard } from "@/lib/ask/types";
import { buildFeedbackFormArtifact } from "@/lib/ask/artifacts";

type Props = {
  towns: ListBusinessTownOption[];
  sessionKey: string;
};

export function AskPageClient({ towns, sessionKey }: Props) {
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [artifactSessionId, setArtifactSessionId] = useState<string | undefined>();
  const [artifact, setArtifact] = useState<AskArtifact | undefined>();
  const [shareableSummary, setShareableSummary] = useState<string | undefined>();
  const [selectedCard, setSelectedCard] = useState<BusinessResultCard | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refineQueue, setRefineQueue] = useState<string | null>(null);

  const businessCards = useMemo(() => {
    if (artifact?.type !== "business_results") return [];
    return artifact.results;
  }, [artifact]);

  const handleMetaUpdate = useCallback(
    (data: {
      conversationId?: string;
      artifactSessionId?: string;
      artifact?: AskArtifact;
      shareableArtifactSummary?: string;
    }) => {
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.artifactSessionId) setArtifactSessionId(data.artifactSessionId);
      if (data.artifact) setArtifact(data.artifact);
      if (data.shareableArtifactSummary) setShareableSummary(data.shareableArtifactSummary);
    },
    [],
  );

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
      setArtifact(
        buildFeedbackFormArtifact({
          businessId: id,
          listingContext: card ? `/business/${card.slug}` : undefined,
        }),
      );
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
  }, []);

  return (
    <div className="flex h-[calc(100dvh-var(--site-header-offset))] min-h-[560px] flex-col bg-background lg:flex-row">
      <section className="flex min-h-0 flex-1 flex-col lg:border-r lg:border-border">
        <header className="border-b border-border px-4 py-4">
          <h1 className="text-page-title text-foreground">Ask WhereTo30A</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Local discovery from verified listings only
          </p>
        </header>
        <ChatPanel
          sessionKey={sessionKey}
          conversationId={conversationId}
          artifactSessionId={artifactSessionId}
          onMetaUpdate={handleMetaUpdate}
          refineMessage={refineQueue}
          onRefineConsumed={() => setRefineQueue(null)}
        />
      </section>

      <Separator orientation="horizontal" className="lg:hidden" />
      <Separator orientation="vertical" className="hidden lg:block" />

      <section className="min-h-[320px] flex-1 lg:max-w-[50%]">
        <ArtifactPanel
          artifact={artifact}
          artifactSessionId={artifactSessionId}
          shareableSummary={shareableSummary}
          towns={towns}
          onSelectBusiness={onSelectBusiness}
          onReportBusiness={onReportBusiness}
          onRemoveFilter={onRemoveFilter}
          onClearFilters={onClearFilters}
          onRefine={(message) => setRefineQueue(message)}
          onStartOver={onStartOver}
        />
      </section>

      <SelectedBusinessDrawer
        card={selectedCard}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onReport={(c) => onReportBusiness(c.id)}
      />
    </div>
  );
}
