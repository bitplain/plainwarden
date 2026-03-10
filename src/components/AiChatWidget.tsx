"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentMemoryItem } from "@/agent/types";
import AiChatPanel from "@/components/ai-chat/AiChatPanel";
import {
  AI_CHAT_CONTEXT_CHIPS,
  getAiChatSuggestions,
  getAiSurfaceLayout,
  getAiWidgetToggleState,
} from "@/components/ai-chat/constants";
import { readAiTheme, subscribeAiTheme, type AiTheme } from "@/components/ai-theme";
import { useAgent } from "@/hooks/useAgent";
import { useAgentMemory } from "@/hooks/useAgentMemory";

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 2L11.4 7.4L17 9L11.4 10.6L10 16L8.6 10.6L3 9L8.6 7.4L10 2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 2.5L16 4L17.5 4.5L16 5L15.5 6.5L15 5L13.5 4.5L15 4L15.5 2.5Z"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M5 5L13 13M13 5L5 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface AiChatWidgetProps {
  initialPrompt?: string;
  onNavigate?: (path: string) => void;
}

export default function AiChatWidget({
  initialPrompt,
  onNavigate,
}: AiChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(initialPrompt ?? "");
  const [activeChipId, setActiveChipId] = useState<string | null>(null);
  const [theme, setTheme] = useState<AiTheme>(readAiTheme);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { items: memoryItems } = useAgentMemory();
  const {
    messages,
    isStreaming,
    pendingAction,
    sendMessage,
    resolveAction,
  } = useAgent({ onNavigate });
  const widgetLayout = getAiSurfaceLayout({
    mode: "floating",
    hasMessages: messages.length > 0,
    hasPendingAction: Boolean(pendingAction),
  });

  const focusComposer = useCallback(() => {
    window.setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  const focusComposer = useCallback(() => {
    window.setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  const closeWidget = useCallback(() => {
    setIsOpen(false);
    setActiveChipId(null);
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      const nextState = getAiWidgetToggleState({
        isOpen: prev,
        activeChipId,
      });

      if (nextState.activeChipId !== activeChipId) {
        setActiveChipId(nextState.activeChipId);
      }

      if (nextState.isOpen) {
        focusComposer();
      }
      return nextState.isOpen;
    });
  }, [activeChipId, focusComposer]);

  useEffect(() => subscribeAiTheme(setTheme), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((prev) => {
          const nextState = getAiWidgetToggleState({
            isOpen: prev,
            activeChipId,
          });

          if (nextState.activeChipId !== activeChipId) {
            setActiveChipId(nextState.activeChipId);
          }

          if (nextState.isOpen) {
            focusComposer();
          }
          return nextState.isOpen;
        });
      }

      if (event.key === "Escape") {
        closeWidget();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeChipId, closeWidget, focusComposer]);

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
    <>
      <motion.button
        type="button"
        onClick={handleToggle}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-[90] flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(13,13,15,0.9)] text-white shadow-[0_20px_46px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-colors hover:border-[rgba(255,255,255,0.18)] sm:bottom-6 sm:right-6"
        aria-label={isOpen ? "Закрыть AI" : "Открыть AI"}
      >
        {isOpen ? <CloseIcon /> : <SparkleIcon />}
      </motion.button>

      <AnimatePresence>
        {isOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px] sm:hidden"
              onClick={closeWidget}
            />

            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[85] sm:left-auto sm:right-6 sm:bottom-[5.5rem] sm:w-[430px]"
              data-ai-widget-stage={widgetLayout.stage}
              className={`fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[85] sm:left-auto sm:right-6 sm:bottom-[5.5rem] ${widgetLayout.widgetWidthClassName}`}
            >
              <AiChatPanel
                mode="floating"
                theme={theme}
                title="AI Ассистент"
                subtitle="Календарь, задачи и заметки в одном контексте."
                messages={messages}
                isStreaming={isStreaming}
                pendingAction={pendingAction}
                inputValue={inputValue}
                inputPlaceholder="Спросите о задачах, встречах или заметках…"
                inputRef={inputRef}
                activeChipId={activeChipId}
                chips={AI_CHAT_CONTEXT_CHIPS}
                suggestions={getAiChatSuggestions("floating")}
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
                emptyTitle="Попросите AI собрать для вас рабочую картину дня."
                emptyBody="Ответы стримятся в реальном времени, markdown сохраняется, а любые деструктивные действия проходят через подтверждение."
                footerHint="Модель и API-ключ управляются в Settings."
                shortcutLabel="⌘K"
              />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
