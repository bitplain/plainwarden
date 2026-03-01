"use client";

import { Streamdown, type Components } from "streamdown";

/* ── Custom components for themed markdown rendering in chat ── */
const chatComponents: Components = {
  h1: ({ children, node, ...props }) => (
    <h3 className="aip-md-heading aip-md-h1" {...props}>{children}</h3>
  ),
  h2: ({ children, node, ...props }) => (
    <h3 className="aip-md-heading aip-md-h2" {...props}>{children}</h3>
  ),
  h3: ({ children, node, ...props }) => (
    <h4 className="aip-md-heading aip-md-h3" {...props}>{children}</h4>
  ),
  h4: ({ children, node, ...props }) => (
    <h5 className="aip-md-heading" {...props}>{children}</h5>
  ),
  h5: ({ children, node, ...props }) => (
    <h6 className="aip-md-heading" {...props}>{children}</h6>
  ),
  h6: ({ children, node, ...props }) => (
    <h6 className="aip-md-heading" {...props}>{children}</h6>
  ),
  p: ({ children, node, ...props }) => (
    <p className="aip-md-p" {...props}>{children}</p>
  ),
  strong: ({ children, node, ...props }) => (
    <strong className="aip-md-strong" {...props}>{children}</strong>
  ),
  em: ({ children, node, ...props }) => (
    <em className="aip-md-em" {...props}>{children}</em>
  ),
  a: ({ href, children, node, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="aip-md-link"
      {...props}
    >
      {children}
    </a>
  ),
  code: ({ children, className, node, ...props }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return <code className={`aip-md-code-block ${className ?? ""}`} {...props}>{children}</code>;
    }
    return <code className="aip-md-code-inline" {...props}>{children}</code>;
  },
  pre: ({ children, node, ...props }) => (
    <pre className="aip-md-pre" {...props}>{children}</pre>
  ),
  ul: ({ children, node, ...props }) => (
    <ul className="aip-md-list aip-md-ul" {...props}>{children}</ul>
  ),
  ol: ({ children, node, ...props }) => (
    <ol className="aip-md-list aip-md-ol" {...props}>{children}</ol>
  ),
  li: ({ children, node, ...props }) => (
    <li className="aip-md-li" {...props}>{children}</li>
  ),
  blockquote: ({ children, node, ...props }) => (
    <blockquote className="aip-md-blockquote" {...props}>{children}</blockquote>
  ),
  table: ({ children, node, ...props }) => (
    <div className="aip-md-table-wrap">
      <table className="aip-md-table" {...props}>{children}</table>
    </div>
  ),
  thead: ({ children, node, ...props }) => (
    <thead className="aip-md-thead" {...props}>{children}</thead>
  ),
  th: ({ children, node, ...props }) => (
    <th className="aip-md-th" {...props}>{children}</th>
  ),
  td: ({ children, node, ...props }) => (
    <td className="aip-md-td" {...props}>{children}</td>
  ),
  hr: ({ node, ...props }) => <hr className="aip-md-hr" {...props} />,
};

interface ChatMarkdownProps {
  content: string;
  isStreaming?: boolean;
}

export default function ChatMarkdown({ content, isStreaming = false }: ChatMarkdownProps) {
  if (!content?.trim()) return <span>&nbsp;</span>;

  return (
    <div className="aip-md">
      <Streamdown
        mode={isStreaming ? "streaming" : "static"}
        isAnimating={isStreaming}
        components={chatComponents}
        skipHtml
      >
        {content}
      </Streamdown>
    </div>
  );
}
