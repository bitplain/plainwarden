"use client";

interface StreamingMessageProps {
  text: string;
  isStreaming?: boolean;
}

export default function StreamingMessage({ text, isStreaming = false }: StreamingMessageProps) {
  return (
    <span>
      <span>{text || "\u00A0"}</span>
      {isStreaming ? <span className="terminal-stream-cursor">▋</span> : null}
    </span>
  );
}
