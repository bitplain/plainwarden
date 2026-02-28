"use client";

import { useCallback, useState } from "react";
import type { AgentMemoryItem } from "@/agent/types";
import { useAgent } from "@/hooks/useAgent";
import { useAgentMemory } from "@/hooks/useAgentMemory";
import AgentConsole from "@/components/AgentConsole";

interface AskAiButtonProps {
  /** Context prompt sent to AI, e.g. "Tell me about task X" */
  prompt: string;
  /** Label for the button */
  label?: string;
  onNavigate?: (path: string) => void;
}

export default function AskAiButton({
  prompt,
  label = "Ask AI",
  onNavigate,
}: AskAiButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { items: memoryItems } = useAgentMemory();

  const {
    messages,
    isStreaming,
    pendingAction,
    sendMessage,
    resolveAction,
  } = useAgent({ onNavigate });

  const handleClick = useCallback(async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
    await sendMessage(prompt, memoryItems as AgentMemoryItem[]);
  }, [isOpen, memoryItems, prompt, sendMessage]);

  const handleResolveAction = useCallback(
    async (approved: boolean) => {
      await resolveAction(approved, memoryItems as AgentMemoryItem[]);
    },
    [memoryItems, resolveAction],
  );

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isStreaming}
        aria-label={label}
        style={{
          padding: "4px 10px",
          background: "var(--color-accent, #6366f1)",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: isStreaming ? "not-allowed" : "pointer",
          fontSize: 12,
          opacity: isStreaming ? 0.6 : 1,
        }}
      >
        {label}
      </button>

      {isOpen && (messages.length > 0 || pendingAction) && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            zIndex: 9997,
            width: 340,
            maxHeight: 300,
            overflowY: "auto",
            marginTop: 4,
            background: "var(--color-bg, #0a0a0a)",
            border: "1px solid var(--color-border, #333)",
            borderRadius: 8,
            padding: "8px 12px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          <AgentConsole
            messages={messages}
            pendingAction={pendingAction}
            isStreaming={isStreaming}
            onResolveAction={handleResolveAction}
          />
        </div>
      )}
    </div>
  );
}
