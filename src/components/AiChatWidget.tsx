"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentMemoryItem } from "@/agent/types";
import { useAgent } from "@/hooks/useAgent";
import { useAgentMemory } from "@/hooks/useAgentMemory";

/* ── Context chip definitions ── */
const CONTEXT_CHIPS = [
  { id: "calendar", icon: "◈", label: "Календарь", prompt: "Расскажи о моих ближайших событиях" },
  { id: "tasks", icon: "◇", label: "Задачи", prompt: "Покажи мои текущие задачи" },
  { id: "notes", icon: "▧", label: "Заметки", prompt: "Что в моих заметках?" },
  { id: "journal", icon: "◎", label: "Журнал", prompt: "Покажи мой журнал за сегодня" },
] as const;

const QUICK_SUGGESTIONS = [
  "Создай событие на завтра в 10:00",
  "Что запланировано на эту неделю?",
  "Добавь заметку",
];

/* ── SVG Icons ── */
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L11.4 7.4L17 9L11.4 10.6L10 16L8.6 10.6L3 9L8.6 7.4L10 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M15.5 2.5L16 4L17.5 4.5L16 5L15.5 6.5L15 5L13.5 4.5L15 4L15.5 2.5Z" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M5 5L13 13M13 5L5 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8H13M13 8L8.5 3.5M13 8L8.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface AiChatWidgetProps {
  initialPrompt?: string;
  onNavigate?: (path: string) => void;
}

export default function AiChatWidget({ initialPrompt, onNavigate }: AiChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(initialPrompt ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const [chipsReady, setChipsReady] = useState(false);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const { items: memoryItems } = useAgentMemory();

  const {
    messages,
    isStreaming,
    pendingAction,
    sendMessage,
    resolveAction,
  } = useAgent({ onNavigate });

  const hasContent = messages.length > 0 || pendingAction !== null;
  const showSendButton = inputValue.trim().length > 0;

  /* ── Toggle ── */
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        setChipsReady(false);
        setActiveChip(null);
      }
      return next;
    });
  }, []);

  /* ── Keyboard shortcut: Cmd/Ctrl + K ── */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleToggle();
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setChipsReady(false);
        setActiveChip(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleToggle, isOpen]);

  /* ── Staggered chips ── */
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => setChipsReady(true), 160);
    return () => clearTimeout(t);
  }, [isOpen]);

  /* ── Auto-scroll response ── */
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    setInputValue("");
    setActiveChip(null);
    await sendMessage(text, memoryItems as AgentMemoryItem[]);
  }, [inputValue, isStreaming, memoryItems, sendMessage]);

  const handleResolveAction = useCallback(
    async (approved: boolean) => {
      await resolveAction(approved, memoryItems as AgentMemoryItem[]);
    },
    [memoryItems, resolveAction],
  );

  const handleChipClick = useCallback(
    (chipId: string, prompt: string) => {
      if (activeChip === chipId) {
        setActiveChip(null);
        setInputValue("");
        return;
      }
      setActiveChip(chipId);
      setInputValue(prompt);
      inputRef.current?.focus();
    },
    [activeChip],
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
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`aip-trigger ${isOpen ? "aip-trigger-open" : ""}`}
        aria-label={isOpen ? "Закрыть AI" : "Открыть AI"}
      >
        {isOpen ? (
          <CloseIcon className="aip-trigger-icon" />
        ) : (
          <SparkleIcon className="aip-trigger-icon" />
        )}
      </button>

      {/* Slide-up panel */}
      <div className={`aip-panel ${isOpen ? "aip-panel-open" : ""}`}>
        <div className="aip-shell">
          <div className={`aip-inner ${isFocused ? "aip-inner-focused" : ""}`}>

            {/* Header */}
            <div className="aip-header">
              <span className="aip-header-icon">◈</span>
              <span className="aip-header-title">AI Ассистент</span>
              <span className="aip-header-shortcut">⌘K</span>
            </div>

            {/* Context chips */}
            <div className={`aip-chips ${isOpen ? "aip-chips-visible" : ""}`}>
              {CONTEXT_CHIPS.map((chip, i) => (
                <button
                  key={chip.id}
                  type="button"
                  className={`aip-chip ${chipsReady ? "aip-chip-visible" : ""} ${activeChip === chip.id ? "aip-chip-active" : ""}`}
                  style={{ transitionDelay: chipsReady ? `${60 + i * 40}ms` : "0ms" }}
                  onClick={() => handleChipClick(chip.id, chip.prompt)}
                >
                  <span className="aip-chip-icon">{chip.icon}</span>
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="aip-separator" />

            {/* Response area */}
            <div
              ref={responseRef}
              className={`aip-response ${hasContent ? "aip-response-visible" : ""}`}
            >
              <div className="aip-response-inner">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`aip-message ${msg.role === "user" ? "aip-message-user" : "aip-message-assistant"}`}
                  >
                    <span>{msg.text || "\u00A0"}</span>
                    {msg.streaming && <span className="aip-cursor" />}
                  </div>
                ))}

                {isStreaming && messages.length === 0 && (
                  <div className="aip-message aip-message-assistant">
                    <span className="aip-cursor" />
                  </div>
                )}
              </div>

              {/* Pending action */}
              {pendingAction && (
                <div className="aip-action">
                  <div className="aip-action-summary">{pendingAction.summary}</div>
                  <div className="aip-action-buttons">
                    <button
                      type="button"
                      className="aip-action-btn aip-action-btn-confirm"
                      onClick={() => void handleResolveAction(true)}
                      disabled={isStreaming}
                    >
                      Подтвердить
                    </button>
                    <button
                      type="button"
                      className="aip-action-btn aip-action-btn-decline"
                      onClick={() => void handleResolveAction(false)}
                      disabled={isStreaming}
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick suggestions (empty state only) */}
            {!hasContent && !inputValue.trim() && (
              <div className={`aip-suggestions ${isOpen ? "aip-suggestions-visible" : ""}`}>
                {QUICK_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="aip-suggestion"
                    onClick={() => {
                      setInputValue(s);
                      inputRef.current?.focus();
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input row */}
            <div className="aip-input-row">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (activeChip) setActiveChip(null);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="aip-input"
                placeholder="Спросите что угодно…"
                disabled={isStreaming}
                spellCheck={false}
                aria-label="AI input"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={isStreaming || !inputValue.trim()}
                className={`aip-send ${showSendButton ? "aip-send-visible" : ""}`}
                aria-label="Отправить"
              >
                <SendIcon />
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
