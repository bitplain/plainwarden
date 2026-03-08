"use client";

import { Streamdown, type Components } from "streamdown";

const markdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h3 className="mt-4 text-[1.05rem] font-semibold tracking-[-0.02em] text-[var(--ai-text-primary)] first:mt-0" {...props}>
      {children}
    </h3>
  ),
  h2: ({ children, ...props }) => (
    <h3 className="mt-4 text-[0.98rem] font-semibold tracking-[-0.02em] text-[var(--ai-text-primary)] first:mt-0" {...props}>
      {children}
    </h3>
  ),
  h3: ({ children, ...props }) => (
    <h4 className="mt-4 text-[0.92rem] font-semibold text-[var(--ai-text-primary)] first:mt-0" {...props}>
      {children}
    </h4>
  ),
  h4: ({ children, ...props }) => (
    <h5 className="mt-4 text-[0.88rem] font-semibold text-[var(--ai-text-primary)] first:mt-0" {...props}>
      {children}
    </h5>
  ),
  h5: ({ children, ...props }) => (
    <h6 className="mt-4 text-[0.84rem] font-semibold text-[var(--ai-text-primary)] first:mt-0" {...props}>
      {children}
    </h6>
  ),
  h6: ({ children, ...props }) => (
    <h6 className="mt-4 text-[0.82rem] font-semibold text-[var(--ai-text-primary)] first:mt-0" {...props}>
      {children}
    </h6>
  ),
  p: ({ children, ...props }) => (
    <p className="mt-3 text-[14px] leading-[1.72] text-[var(--ai-text-secondary)] first:mt-0" {...props}>
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-[var(--ai-text-primary)]" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic text-[var(--ai-text-primary)]" {...props}>
      {children}
    </em>
  ),
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-[var(--ai-accent)] underline decoration-[var(--ai-accent)]/40 underline-offset-4 transition-colors hover:text-[var(--ai-text-primary)]"
      {...props}
    >
      {children}
    </a>
  ),
  code: ({ children, className, ...props }) => {
    if (className?.includes("language-")) {
      return (
        <code
          className={`block min-w-full font-mono text-[12px] leading-[1.7] text-[var(--ai-text-secondary)] ${className}`}
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <code
        className="rounded-md border border-[var(--ai-border)] bg-black/25 px-1.5 py-0.5 font-mono text-[12px] text-[var(--ai-text-primary)]"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre
      className="mt-3 overflow-x-auto rounded-[18px] border border-[var(--ai-border)] bg-black/28 p-4 font-mono text-[12px] first:mt-0"
      {...props}
    >
      {children}
    </pre>
  ),
  ul: ({ children, ...props }) => (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] leading-[1.72] text-[var(--ai-text-secondary)] first:mt-0" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[14px] leading-[1.72] text-[var(--ai-text-secondary)] first:mt-0" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="pl-1" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="mt-3 rounded-r-[16px] border-l-2 border-[var(--ai-accent)] bg-white/[0.03] px-4 py-3 text-[14px] leading-[1.72] text-[var(--ai-text-secondary)] first:mt-0"
      {...props}
    >
      {children}
    </blockquote>
  ),
  table: ({ children, ...props }) => (
    <div className="mt-3 overflow-x-auto rounded-[18px] border border-[var(--ai-border)] first:mt-0">
      <table className="min-w-full border-collapse text-left text-[13px] [&_tbody_tr:last-child_td]:border-b-0" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-white/[0.04] text-[var(--ai-text-primary)]" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th className="border-b border-[var(--ai-border)] px-4 py-2.5 font-medium" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border-b border-[var(--ai-border)] px-4 py-2.5 align-top text-[var(--ai-text-secondary)]" {...props}>
      {children}
    </td>
  ),
  hr: (props) => <hr className="my-4 border-t border-[var(--ai-border)]" {...props} />,
};

interface ChatMarkdownProps {
  content: string;
  isStreaming?: boolean;
}

export default function ChatMarkdown({
  content,
  isStreaming = false,
}: ChatMarkdownProps) {
  if (!content.trim()) {
    return <span className="inline-block min-h-[1.5rem]">&nbsp;</span>;
  }

  return (
    <div className="[&_[data-streamdown-caret]]:text-[var(--ai-accent)] [&_[data-streamdown-caret]]:animate-pulse">
      <Streamdown
        mode={isStreaming ? "streaming" : "static"}
        isAnimating={isStreaming}
        components={markdownComponents}
        skipHtml
      >
        {content}
      </Streamdown>
    </div>
  );
}
