"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentMemoryItem } from "@/agent/types";
import AiChatPanel from "@/components/ai-chat/AiChatPanel";
import {
  AI_CHAT_CONTEXT_CHIPS,
  getAiChatSuggestions,
} from "@/components/ai-chat/constants";
import { readAiTheme, subscribeAiTheme, type AiTheme } from "@/components/ai-theme";
import { useAgent } from "@/hooks/useAgent";
import { useAgentMemory } from "@/hooks/useAgentMemory";

export default function Calendar2AiPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [theme, setTheme] = useState<AiTheme>(() => readAiTheme());
  const [inputValue, setInputValue] = useState("");
  const [activeChipId, setActiveChipId] = useState<string | null>(null);
  const { items: memoryItems } = useAgentMemory();
  const {
    messages,
    isStreaming,
    pendingAction,
    sendMessage,
    resolveAction,
  } = useAgent({
    onNavigate: (path) => {
      router.push(path);
    },
  });

  useEffect(() => subscribeAiTheme(setTheme), []);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) {
      return;
    }

    setInputValue("");
    setActiveChipId(null);
    await sendMessage(text, memoryItems as AgentMemoryItem[]);
  }, [inputValue, isStreaming, memoryItems, sendMessage]);

  const handleResolveAction = useCallback(
    async (approved: boolean) => {
      await resolveAction(approved, memoryItems as AgentMemoryItem[]);
    },
    [memoryItems, resolveAction],
  );

  const focusComposer = useCallback(() => {
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const handleChipClick = useCallback((chipId: string, prompt: string) => {
    setActiveChipId((prev) => {
      const next = prev === chipId ? null : chipId;
      setInputValue(next ? prompt : "");
      return next;
    });
    focusComposer();
  }, [focusComposer]);

  const handleSuggestionSelect = useCallback((prompt: string) => {
    setActiveChipId(null);
    setInputValue(prompt);
    focusComposer();
  }, [focusComposer]);

  return (
    <AiChatPanel
      mode="embedded"
      theme={theme}
      title="AI Ассистент"
      subtitle="Тот же chat-shell, встроенный в календарный контур."
      messages={messages}
      isStreaming={isStreaming}
      pendingAction={pendingAction}
      inputValue={inputValue}
      inputPlaceholder="Например: разложи задачи по неделе и подскажи приоритеты…"
      inputRef={inputRef}
      activeChipId={activeChipId}
      chips={AI_CHAT_CONTEXT_CHIPS}
      suggestions={getAiChatSuggestions("embedded")}
      onChipClick={handleChipClick}
      onSuggestionSelect={handleSuggestionSelect}
      onInputChange={(value) => {
        setInputValue(value);
        if (activeChipId) {
          setActiveChipId(null);
        }
      }}
      onSubmit={handleSend}
      onResolveAction={handleResolveAction}
      emptyTitle="Соберите контекст недели прямо внутри календаря."
      emptyBody="Используйте естественный язык, чтобы искать события, приоритеты и заметки без переключения между вкладками."
      footerHint="Текущая модель остаётся общей и настраивается в Settings."
    />
  );
}
