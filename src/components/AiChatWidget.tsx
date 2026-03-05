"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentMemoryItem } from "@/agent/types";
import { useAgent } from "@/hooks/useAgent";
import { useAgentMemory } from "@/hooks/useAgentMemory";
import ChatMarkdown from "@/components/ChatMarkdown";
import styles from "@/components/AiChatWidget.module.css";
import { readAiTheme, subscribeAiTheme, type AiTheme } from "@/components/ai-theme";

/* ── Context chip definitions ── */
const CONTEXT_CHIPS = [
  { id: "calendar", icon: "◈", label: "Календарь", prompt: "Расскажи о моих ближайших событиях" },
  { id: "tasks", icon: "◇", label: "Задачи", prompt: "Покажи мои текущие задачи" },
  { id: "notes", icon: "▧", label: "Заметки", prompt: "Что в моих заметках?" },
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
  const [theme, setTheme] = useState<AiTheme>(readAiTheme);
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

  /* ── Listen for theme changes from settings ── */
  useEffect(() => subscribeAiTheme(setTheme), []);

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

  /* ── Resolve pending action ── */
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
    <div data-aip-theme={theme}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`${styles['aip-trigger']} ${isOpen ? styles['aip-trigger-open'] : ''}`}
        aria-label={isOpen ? "Закрыть AI" : "Открыть AI"}
      >
        {isOpen ? (
          <CloseIcon className={styles['aip-trigger-icon']} />
        ) : (
          <SparkleIcon className={styles['aip-trigger-icon']} />
        )}
      </button>

      {/* Slide-up panel */}
      <div className={`${styles['aip-panel']} ${isOpen ? styles['aip-panel-open'] : ''}`}>
        <div className={styles['aip-shell']}>
          <div className={`${styles['aip-inner']} ${isFocused ? styles['aip-inner-focused'] : ''} ${isStreaming ? styles['aip-streaming'] : ''}`}>

            {/* Header */}
            <div className={styles['aip-header']}>
              <span className={styles['aip-header-icon']}>◈</span>
              <span className={styles['aip-header-title']}>AI Ассистент</span>
              <span className={styles['aip-header-shortcut']}>⌘K</span>
            </div>

            {/* Context chips */}
            <div className={`${styles['aip-chips']} ${isOpen ? styles['aip-chips-visible'] : ''}`}>
              {CONTEXT_CHIPS.map((chip, i) => (
                <button
                  key={chip.id}
                  type="button"
                  className={`${styles['aip-chip']} ${chipsReady ? styles['aip-chip-visible'] : ''} ${activeChip === chip.id ? styles['aip-chip-active'] : ''}`}
                  style={{ transitionDelay: chipsReady ? `${60 + i * 40}ms` : "0ms" }}
                  onClick={() => handleChipClick(chip.id, chip.prompt)}
                >
                  <span className={styles['aip-chip-icon']}>{chip.icon}</span>
                  {chip.label}
                </button>
              ))}
            </div>

            <div className={styles['aip-separator']} />

            {/* Streaming status bar */}
            <div className={`${styles['aip-status-bar']} ${isStreaming ? styles['aip-status-bar-active'] : ''}`} />

            {/* Response area */}
            <div
              ref={responseRef}
              className={`${styles['aip-response']} ${hasContent ? styles['aip-response-visible'] : ''}`}
            >
              <div className={styles['aip-response-inner']}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`${styles['aip-message']} ${msg.role === "user" ? styles['aip-message-user'] : styles['aip-message-assistant']}`}
                  >
                    {msg.role === "assistant" ? (
                      <ChatMarkdown content={msg.text} isStreaming={msg.streaming} />
                    ) : (
                      <span>{msg.text || "\u00A0"}</span>
                    )}
                  </div>
                ))}

                {isStreaming && messages.length === 0 && (
                  <div className={`${styles['aip-message']} ${styles['aip-message-assistant']} ${styles['aip-message-thinking']}`}>
                    <span className={styles['aip-thinking']}>
                      <span className={styles['aip-thinking-dot']} />
                      <span className={styles['aip-thinking-dot']} />
                      <span className={styles['aip-thinking-dot']} />
                    </span>
                  </div>
                )}
              </div>

              {/* Pending action */}
              {pendingAction && (
                <div className={styles['aip-action']}>
                  <div className={styles['aip-action-summary']}>{pendingAction.summary}</div>
                  <div className={styles['aip-action-buttons']}>
                    <button
                      type="button"
                      className={`${styles['aip-action-btn']} ${styles['aip-action-btn-confirm']}`}
                      onClick={() => void handleResolveAction(true)}
                      disabled={isStreaming}
                    >
                      Подтвердить
                    </button>
                    <button
                      type="button"
                      className={`${styles['aip-action-btn']} ${styles['aip-action-btn-decline']}`}
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
              <div className={`${styles['aip-suggestions']} ${isOpen ? styles['aip-suggestions-visible'] : ''}`}>
                {QUICK_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={styles['aip-suggestion']}
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
            <div className={styles['aip-input-row']}>
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
                className={styles['aip-input']}
                placeholder="Спросите что угодно…"
                disabled={isStreaming}
                spellCheck={false}
                aria-label="AI input"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={isStreaming || !inputValue.trim()}
                className={`${styles['aip-send']} ${showSendButton ? styles['aip-send-visible'] : ''}`}
                aria-label="Отправить"
              >
                <SendIcon />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
