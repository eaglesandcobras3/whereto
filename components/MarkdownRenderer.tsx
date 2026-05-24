import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkdownBusinessCard } from "@/components/MarkdownBusinessCard";
import { fetchBusinessesForMarkdownCards } from "@/lib/data/markdown-business-cards";
import {
  extractBusinessCardSlugs,
  preprocessMarkdownForBusinessCards,
} from "@/lib/markdown/business-cards-syntax";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

type Props = {
  content: string;
  className?: string;
};

export async function MarkdownRenderer({ content, className = "" }: Props) {
  const slugs = extractBusinessCardSlugs(content);
  const businessCards =
    slugs.length > 0 ? await fetchBusinessesForMarkdownCards(slugs) : {};
  const processed = preprocessMarkdownForBusinessCards(content);

  return (
    <div
      className={`prose prose-zinc max-w-none 
      prose-headings:font-headline prose-headings:tracking-tight prose-headings:text-[var(--color-text-primary)] prose-headings:normal-case
      prose-p:text-[var(--color-text-secondary)] prose-p:leading-relaxed prose-p:text-lg
      prose-li:text-[var(--color-text-secondary)] prose-li:text-lg
      prose-strong:text-[var(--color-text-primary)] prose-strong:font-bold
      prose-blockquote:border-l-4 prose-blockquote:border-[var(--color-primary)] prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-[var(--color-text-primary)]
      prose-img:rounded-[2rem] prose-img:shadow-premium-lg
      ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-4xl md:text-5xl font-extrabold mb-8 normal-case" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-3xl font-semibold mt-16 mb-6 normal-case" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-semibold mt-10 mb-4 normal-case" {...props} />
          ),
          p: ({ node, ...props }) => <p className="mb-6" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-8 mb-8 space-y-3" {...props} />,
          hr: () => <hr className="my-16 border-[var(--color-border-strong)]" />,
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
        {processed}
      </ReactMarkdown>
    </div>
  );
}
