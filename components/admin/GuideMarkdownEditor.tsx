"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { MarkdownBody } from "@/components/MarkdownBody";
import { preprocessMarkdownForBusinessCards } from "@/lib/markdown/business-cards-syntax";
import { cn } from "@/lib/utils";

type ViewMode = "write" | "preview" | "split";

type ToolbarAction = {
  id: string;
  label: string;
  icon: string;
  title: string;
  apply: (selected: string) => { text: string; cursorOffset: number };
};

const TOOLBAR: ToolbarAction[] = [
  {
    id: "h2",
    label: "H2",
    icon: "title",
    title: "Heading 2",
    apply: (selected) => ({
      text: `## ${selected || "Section title"}`,
      cursorOffset: selected ? 0 : -("Section title".length),
    }),
  },
  {
    id: "h3",
    label: "H3",
    icon: "format_h3",
    title: "Heading 3",
    apply: (selected) => ({
      text: `### ${selected || "Subsection"}`,
      cursorOffset: selected ? 0 : -("Subsection".length),
    }),
  },
  {
    id: "bold",
    label: "B",
    icon: "format_bold",
    title: "Bold",
    apply: (selected) => ({
      text: `**${selected || "bold text"}**`,
      cursorOffset: selected ? 0 : -("bold text".length + 2),
    }),
  },
  {
    id: "italic",
    label: "I",
    icon: "format_italic",
    title: "Italic",
    apply: (selected) => ({
      text: `*${selected || "italic text"}*`,
      cursorOffset: selected ? 0 : -("italic text".length + 1),
    }),
  },
  {
    id: "link",
    label: "Link",
    icon: "link",
    title: "Link",
    apply: (selected) => ({
      text: `[${selected || "link text"}](https://)`,
      cursorOffset: selected ? -1 : -("https://".length + 1),
    }),
  },
  {
    id: "list",
    label: "List",
    icon: "format_list_bulleted",
    title: "Bullet list",
    apply: (selected) => {
      const lines = (selected || "List item").split("\n");
      const text = lines.map((line) => `- ${line}`).join("\n");
      return { text, cursorOffset: 0 };
    },
  },
  {
    id: "quote",
    label: "Quote",
    icon: "format_quote",
    title: "Blockquote",
    apply: (selected) => ({
      text: `> ${selected || "Pull quote"}`,
      cursorOffset: selected ? 0 : -("Pull quote".length),
    }),
  },
  {
    id: "business",
    label: "Business",
    icon: "storefront",
    title: "Business embed",
    apply: (selected) => ({
      text: `[[${selected || "business-slug"}]] — Short blurb shown on the card`,
      cursorOffset: selected ? 0 : -("business-slug".length + 40),
    }),
  },
];

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function applyEdit(
  value: string,
  start: number,
  end: number,
  insert: string,
  cursorOffsetFromEnd: number,
  onChange: (next: string) => void,
  textarea: HTMLTextAreaElement,
) {
  const next = value.slice(0, start) + insert + value.slice(end);
  onChange(next);
  const cursor = start + insert.length + cursorOffsetFromEnd;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(cursor, cursor);
  });
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function GuideMarkdownEditor({ value, onChange, placeholder }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [view, setView] = useState<ViewMode>("write");

  const lineCount = useMemo(() => (value ? value.split("\n").length : 1), [value]);
  const wordCount = useMemo(() => countWords(value), [value]);
  const readingMinutes = Math.max(1, Math.round(wordCount / 200));

  const previewContent = useMemo(
    () => preprocessMarkdownForBusinessCards(value.trim() || "*Nothing to preview yet.*"),
    [value],
  );

  const runToolbarAction = useCallback(
    (action: ToolbarAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.slice(start, end);
      const { text, cursorOffset } = action.apply(selected);
      applyEdit(value, start, end, text, cursorOffset, onChange, textarea);
    },
    [onChange, value],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    const action =
      key === "b"
        ? TOOLBAR.find((t) => t.id === "bold")
        : key === "i"
          ? TOOLBAR.find((t) => t.id === "italic")
          : key === "k"
            ? TOOLBAR.find((t) => t.id === "link")
            : undefined;
    if (!action) return;
    event.preventDefault();
    runToolbarAction(action);
  };

  const showWrite = view === "write" || view === "split";
  const showPreview = view === "preview" || view === "split";

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50/90 px-3 py-2">
        <div className="flex items-center gap-1 rounded-lg bg-white p-0.5 shadow-sm ring-1 ring-zinc-200/80">
          {(
            [
              ["write", "Write"],
              ["preview", "Preview"],
              ["split", "Split"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                view === mode
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {showWrite ? (
          <div className="flex flex-wrap items-center gap-0.5">
            {TOOLBAR.map((action) => (
              <button
                key={action.id}
                type="button"
                title={action.title}
                onClick={() => runToolbarAction(action)}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-white hover:text-zinc-900 hover:shadow-sm"
              >
                <span className="material-symbols-outlined !text-[1.05rem]" aria-hidden>
                  {action.icon}
                </span>
                <span className="sr-only">{action.title}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "grid min-h-[32rem]",
          view === "split" ? "grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-zinc-200" : "grid-cols-1",
        )}
      >
        {showWrite ? (
          <div className="relative min-h-[24rem] lg:min-h-[32rem]">
            <div className="flex h-full min-h-[24rem] max-h-[70vh] overflow-auto lg:min-h-[32rem]">
              <div
                aria-hidden
                className="hidden w-11 shrink-0 select-none border-r border-zinc-100 bg-zinc-50/80 py-4 text-right font-mono text-[11px] leading-6 text-zinc-400 sm:block"
              >
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i} className="pr-3">
                    {i + 1}
                  </div>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck
                placeholder={placeholder}
                className="min-h-[24rem] w-full flex-1 resize-none border-0 bg-white px-4 py-4 font-mono text-[13px] leading-6 text-zinc-800 outline-none placeholder:text-zinc-400 focus:ring-0 sm:pl-3 lg:min-h-[32rem]"
              />
            </div>
          </div>
        ) : null}

        {showPreview ? (
          <div className="min-h-[24rem] overflow-y-auto bg-[var(--color-surface-container-low)] px-5 py-6 sm:px-8 lg:min-h-[32rem] lg:max-h-[70vh]">
            <div className="mx-auto max-w-2xl">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Live preview
              </p>
              <MarkdownBody content={previewContent} compact className="guide-admin-preview" />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-[11px] text-zinc-500">
        <p>
          Markdown only · embed businesses with{" "}
          <code className="rounded bg-white px-1 py-0.5 font-mono text-zinc-700">[[business-slug]]</code>
        </p>
        <p className="font-medium tabular-nums text-zinc-600">
          {lineCount} {lineCount === 1 ? "line" : "lines"} · {wordCount} words · ~{readingMinutes} min read
        </p>
      </div>
    </div>
  );
}
