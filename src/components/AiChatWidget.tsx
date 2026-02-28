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

/* ── Quick suggestions for empty state ── */
const QUICK_SUGGESTIONS = [
  "Создай событие на завтра в 10:00",
  "Что запланировано на эту неделю?",
  "Добавь заметку",
  "Покажи задачи на сегодня",
];

/* ── SVG icons ── */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M11.5 11.5L15.5 15.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 1.5L10.3 6.7L15.5 8L10.3 9.3L9 14.5L7.7 9.3L2.5 8L7.7 6.7L9 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M14 2L14.5 3.5L16 4L14.5 4.5L14 6L13.5 4.5L12 4L13.5 3.5L14 2Z" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
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
  const isActive = isOpen && (hasContent || isFocused);
  const showSendButton = inputValue.trim().length > 0;

  /* ── Toggle open/close ── */
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => inputRef.current?.focus(), 80);
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

  /* ── Staggered chip animation on open ── */
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => setChipsReady(true), 140);
    return () => clearTimeout(timer);
  }, [isOpen]);

  /* ── Auto-scroll response ── */
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  /* ── Send message ── */
  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    setInputValue("");
    setActiveChip(null);
    await sendMessage(text, memoryItems as AgentMemoryItem[]);
  }, [inputValue, isStreaming, memoryItems, sendMessage]);

  /* ── Resolve pending action ── */
  const handleResolveAction = useCallback(
    async (approved: boolean) => {
      await resolveAction(approved, memoryItems as AgentMemoryItem[]);
    },
    [memoryItems, resolveAction],
  );

  /* ── Chip click: insert prompt ── */
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

  /* ── Suggestion click ── */
  const handleSuggestionClick = useCallback(
    (text: string) => {
      setInputValue(text);
      inputRef.current?.focus();
    },
    [],
  );

  /* ── Key handlers ── */
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
      {/* Backdrop */}
      <div
        className={`ai-bar-backdrop ${isOpen ? "ai-bar-backdrop-visible" : ""}`}
        onClick={() => {
          setIsOpen(false);
          setChipsReady(false);
          setActiveChip(null);
        }}
        aria-hidden
      />

      {/* Command bar */}
      {isOpen && (
        <div className={`ai-bar ${isActive ? "ai-bar-active" : "ai-bar-idle"}`}>
          <div className={`ai-bar-shell ${isFocused || hasContent ? "ai-bar-shell-focused" : ""}`}>
            <div className={`ai-bar-inner ${isFocused ? "ai-bar-focused" : ""}`}>

              {/* Context chips */}
              <div className={`ai-bar-chips ${isOpen ? "ai-bar-chips-visible" : ""}`}>
                {CONTEXT_CHIPS.map((chip, i) => (
                  <button
                    key={chip.id}
                    type="button"
                    className={`ai-bar-chip ${chipsReady ? "ai-bar-chip-visible" : ""} ${activeChip === chip.id ? "ai-bar-chip-active" : ""}`}
                    style={{ transitionDelay: chipsReady ? `${80 + i * 50}ms` : "0ms" }}
                    onClick={() => handleChipClick(chip.id, chip.prompt)}
                  >
                    <span className="ai-bar-chip-icon">{chip.icon}</span>
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Input row */}
              <div className="ai-bar-input-row">
                <div className="ai-bar-input-icon">
                  <SearchIcon />
                </div>
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
                  className="ai-bar-input"
                  placeholder="Спросите что угодно…"
                  disabled={isStreaming}
                  autoFocus
                  spellCheck={false}
                  aria-label="AI command bar input"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={isStreaming || !inputValue.trim()}
                  className={`ai-bar-send ${showSendButton ? "ai-bar-send-visible" : ""}`}
                  aria-label="Отправить"
                >
                  <SendIcon />
                </button>
              </div>

              {/* Hints (idle only) */}
              {!hasContent && !inputValue.trim() && (
                <div className="ai-bar-hints">
                  <span>
                    <span className="ai-bar-hint-key">⌘K</span>
                    открыть
                  </span>
                  <span>
                    <span className="ai-bar-hint-key">↵</span>
                    отправить
                  </span>
                  <span>
                    <span className="ai-bar-hint-key">Esc</span>
                    закрыть
                  </span>
                </div>
              )}

              {/* Quick suggestions */}
              {!hasContent && !inputValue.trim() && (
                <>
                  <div className="ai-bar-separator" />
                  <div className={`ai-bar-suggestions ${isOpen ? "ai-bar-suggestions-visible" : ""}`}>
                    {QUICK_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="ai-bar-suggestion"
                        onClick={() => handleSuggestionClick(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Separator before response */}
              {hasContent && <div className="ai-bar-separator" />}

              {/* Response area */}
              <div
                ref={responseRef}
                className={`ai-bar-response ${hasContent ? "ai-bar-response-visible" : ""}`}
              >
                <div className="ai-bar-response-inner">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`ai-bar-message ${message.role === "user" ? "ai-bar-message-user" : "ai-bar-message-assistant"}`}
                    >
                      <span>{message.text || "\u00A0"}</span>
                      {message.streaming && <span className="ai-bar-cursor" />}
                    </div>
                  ))}

                  {isStreaming && messages.length === 0 && (
                    <div className="ai-bar-message ai-bar-message-assistant">
                      <span className="ai-bar-cursor" />
                    </div>
                  )}
                </div>

                {/* Pending action */}
                {pendingAction && (
                  <div className="ai-bar-action">
                    <div className="ai-bar-action-summary">{pendingAction.summary}</div>
                    <div className="ai-bar-action-buttons">
                      <button
                        type="button"
                        className="ai-bar-action-btn ai-bar-action-btn-confirm"
                        onClick={() => void handleResolveAction(true)}
                        disabled={isStreaming}
                      >
                        Подтвердить
                      </button>
                      <button
                        type="button"
                        className="ai-bar-action-btn ai-bar-action-btn-decline"
                        onClick={() => void handleResolveAction(false)}
                        disabled={isStreaming}
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`ai-bar-trigger ${isOpen ? "ai-bar-trigger-open" : ""}`}
        aria-label={isOpen ? "Закрыть AI" : "Открыть AI"}
      >
        {isOpen ? (
          <CloseIcon className="ai-bar-trigger-icon" />
        ) : (
          <SparkleIcon className="ai-bar-trigger-icon" />
        )}
      </button>
    </>
  );
}
