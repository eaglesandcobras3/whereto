import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  content: string;
  className?: string;
};

export function MarkdownRenderer({ content, className = "" }: Props) {
  return (
    <div className={`prose prose-zinc max-w-none 
      prose-h1:font-headline prose-h1:text-4xl prose-h1:font-extrabold prose-h1:tracking-tighter prose-h1:text-zinc-900 prose-h1:mb-8
      prose-h2:font-headline prose-h2:text-3xl prose-h2:font-extrabold prose-h2:tracking-tight prose-h2:text-zinc-900 prose-h2:mt-12 prose-h2:mb-6
      prose-h3:font-headline prose-h3:text-xl prose-h3:font-bold prose-h3:text-zinc-900 prose-h3:mt-8 prose-h3:mb-4
      prose-p:text-zinc-700 prose-p:leading-relaxed prose-p:mb-6 prose-p:text-lg
      prose-ul:list-disc prose-ul:pl-8 prose-ul:mb-8 prose-ul:space-y-3
      prose-li:text-zinc-700 prose-li:text-lg
      prose-strong:text-zinc-900 prose-strong:font-bold
      prose-blockquote:border-l-4 prose-blockquote:border-teal-600 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-zinc-800
      prose-img:rounded-3xl prose-img:shadow-lg
      ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
