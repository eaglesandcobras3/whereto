import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  content: string;
  className?: string;
};

export function MarkdownRenderer({ content, className = "" }: Props) {
  return (
    <div className={`prose prose-zinc max-w-none 
      prose-headings:font-headline prose-headings:tracking-tight prose-headings:text-[var(--color-text-primary)]
      prose-p:text-[var(--color-text-secondary)] prose-p:leading-relaxed prose-p:text-lg
      prose-li:text-[var(--color-text-secondary)] prose-li:text-lg
      prose-strong:text-[var(--color-text-primary)] prose-strong:font-bold
      prose-blockquote:border-l-4 prose-blockquote:border-[var(--color-primary)] prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-[var(--color-text-primary)]
      prose-img:rounded-[2rem] prose-img:shadow-premium-lg
      ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-4xl md:text-5xl font-extrabold mb-8" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-3xl font-extrabold mt-16 mb-6" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-xl font-bold mt-10 mb-4" {...props} />,
          p: ({ node, ...props }) => <p className="mb-6" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-8 mb-8 space-y-3" {...props} />,
          hr: () => <hr className="my-16 border-[var(--color-border-strong)]" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
