"use client";

import { useCallback, useRef, useState } from "react";
import type { AgentMemoryItem } from "@/agent/types";
import { useAgent } from "@/hooks/useAgent";
import { useAgentMemory } from "@/hooks/useAgentMemory";
import AgentConsole from "@/components/AgentConsole";

interface AiChatWidgetProps {
  /** Pre-fill the input with a context prompt (e.g. "Ask AI" about specific item) */
  initialPrompt?: string;
  onNavigate?: (path: string) => void;
}

export default function AiChatWidget({ initialPrompt, onNavigate }: AiChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(initialPrompt ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const { items: memoryItems } = useAgentMemory();

  const {
    messages,
    isStreaming,
    pendingAction,
    sendMessage,
    resolveAction,
  } = useAgent({ onNavigate });

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      return next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    setInputValue("");
    await sendMessage(text, memoryItems as AgentMemoryItem[]);
  }, [inputValue, isStreaming, memoryItems, sendMessage]);

  const handleResolveAction = useCallback(
    async (approved: boolean) => {
      await resolveAction(approved, memoryItems as AgentMemoryItem[]);
    },
    [memoryItems, resolveAction],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  return (
    <>
      {/* Floating toggle button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={isOpen ? "Close AI chat" : "Open AI chat"}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--color-accent, #6366f1)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        }}
      >
        {isOpen ? "✕" : "AI"}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            right: 24,
            zIndex: 9998,
            width: 380,
            maxHeight: "60vh",
            background: "var(--color-bg, #0a0a0a)",
            border: "1px solid var(--color-border, #333)",
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--color-border, #333)",
              fontWeight: 600,
              fontSize: 14,
              color: "var(--color-text, #ededed)",
            }}
          >
            AI Assistant
          </div>

          {/* Messages area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "8px 12px",
              minHeight: 120,
              maxHeight: "calc(60vh - 120px)",
            }}
          >
            {messages.length === 0 && !pendingAction ? (
              <div
                style={{
                  color: "var(--color-muted, #888)",
                  fontSize: 13,
                  padding: "16px 0",
                  textAlign: "center",
                }}
              >
                Ask me anything about your calendar, tasks, notes, or journal.
              </div>
            ) : (
              <AgentConsole
                messages={messages}
                pendingAction={pendingAction}
                isStreaming={isStreaming}
                onResolveAction={handleResolveAction}
              />
            )}
          </div>

          {/* Input area */}
          <div
            style={{
              padding: "8px 12px",
              borderTop: "1px solid var(--color-border, #333)",
              display: "flex",
              gap: 8,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={isStreaming}
              style={{
                flex: 1,
                background: "var(--color-input-bg, #1a1a1a)",
                border: "1px solid var(--color-border, #333)",
                borderRadius: 6,
                padding: "8px 12px",
                color: "var(--color-text, #ededed)",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isStreaming || !inputValue.trim()}
              aria-label="Send message"
              style={{
                padding: "8px 14px",
                background: "var(--color-accent, #6366f1)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: isStreaming || !inputValue.trim() ? "not-allowed" : "pointer",
                fontSize: 13,
                opacity: isStreaming || !inputValue.trim() ? 0.5 : 1,
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
