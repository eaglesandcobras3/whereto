import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkdownBusinessCard } from "@/components/MarkdownBusinessCard";
import type { MarkdownBusinessCardData } from "@/lib/data/markdown-business-cards";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
  businessCards?: Record<string, MarkdownBusinessCardData | undefined>;
  className?: string;
  compact?: boolean;
};

export function MarkdownBody({
  content,
  businessCards = {},
  className = "",
  compact = false,
}: Props) {
  return (
    <div
      className={cn(
        `prose prose-zinc max-w-none 
      prose-headings:font-headline prose-headings:tracking-tight prose-headings:text-[var(--color-text-primary)] prose-headings:normal-case
      prose-p:text-[var(--color-text-secondary)] prose-p:leading-relaxed
      prose-li:text-[var(--color-text-secondary)]
      prose-strong:text-[var(--color-text-primary)] prose-strong:font-bold
      prose-blockquote:border-l-4 prose-blockquote:border-[var(--color-primary)] prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-[var(--color-text-primary)]
      prose-img:rounded-[2rem] prose-img:shadow-premium-lg`,
        compact
          ? "prose-p:text-base prose-li:text-base prose-p:mb-4 prose-li:mb-0"
          : "prose-p:text-lg prose-li:text-lg prose-p:mb-6",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className={cn(
                "font-extrabold normal-case",
                compact ? "mb-4 text-2xl sm:text-3xl" : "mb-8 text-4xl md:text-5xl",
              )}
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className={cn(
                "font-semibold normal-case",
                compact ? "mt-8 mb-4 text-xl sm:text-2xl" : "mt-16 mb-6 text-3xl",
              )}
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className={cn(
                "font-semibold normal-case",
                compact ? "mt-6 mb-3 text-lg" : "mt-10 mb-4 text-xl",
              )}
              {...props}
            />
          ),
          p: ({ node, ...props }) => <p className={compact ? "mb-4" : "mb-6"} {...props} />,
          ul: ({ node, ...props }) => (
            <ul className={cn("list-disc pl-8", compact ? "mb-5 space-y-2" : "mb-8 space-y-3")} {...props} />
          ),
          hr: () => (
            <hr
              className={cn(
                "border-[var(--color-border-strong)]",
                compact ? "my-8" : "my-16",
              )}
            />
          ),
          a: ({ href, title, children, ...rest }) => {
            if (typeof href === "string" && href.startsWith("whereto-card:")) {
              const slug = href.slice("whereto-card:".length);
              const markdownNote = typeof title === "string" ? title : undefined;
              return (
                <MarkdownBusinessCard
                  slug={slug}
                  markdownNote={markdownNote}
                  business={businessCards[slug]}
                />
              );
            }
            return (
              <a
                href={href}
                title={title}
                {...gaClickProps({
                  event: "nav_click",
                  category: "markdown_link",
                  label: href,
                })}
                {...rest}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
