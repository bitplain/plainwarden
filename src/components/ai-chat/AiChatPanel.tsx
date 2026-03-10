"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useRef, type RefObject } from "react";
import type { AgentActionProposal } from "@/agent/types";
import type { AgentUIMessage } from "@/hooks/useAgent";
import type { AiTheme } from "@/components/ai-theme";
import type { AiPromptChip, AiSuggestion } from "@/components/ai-chat/constants";
import {
  AI_THEME_META,
  getAiScrollBehavior,
  getAiSurfaceLayout,
} from "@/components/ai-chat/constants";
import { getAiThemeStyles, shouldSubmitAiComposerKey } from "@/components/ai-chat/theme";
import ChatMarkdown from "@/components/ChatMarkdown";

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M3.75 9H14.25M14.25 9L9.75 4.5M14.25 9L9.75 13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="h-2 w-2 rounded-full bg-[var(--ai-accent)]"
          animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
          transition={{
            duration: 1.1,
            repeat: Number.POSITIVE_INFINITY,
            delay: index * 0.12,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

interface AiChatPanelProps {
  mode: "floating" | "embedded";
  theme: AiTheme;
  title: string;
  subtitle: string;
  messages: AgentUIMessage[];
  isStreaming: boolean;
  pendingAction: AgentActionProposal | null;
  inputValue: string;
  inputPlaceholder: string;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  activeChipId: string | null;
  chips: readonly AiPromptChip[];
  suggestions: readonly AiSuggestion[];
  onChipClick: (chipId: string, prompt: string) => void;
  onSuggestionSelect: (prompt: string) => void;
  onInputChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  onResolveAction: (approved: boolean) => Promise<void>;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  emptyTitle: string;
  emptyBody: string;
  footerHint?: string;
  shortcutLabel?: string;
}

export default function AiChatPanel({
  mode,
  theme,
  title,
  subtitle,
  messages,
  isStreaming,
  pendingAction,
  inputValue,
  inputPlaceholder,
  inputRef,
  activeChipId,
  chips,
  suggestions,
  onChipClick,
  onSuggestionSelect,
  onInputChange,
  onSubmit,
  onResolveAction,
  onInputFocus,
  onInputBlur,
  emptyTitle,
  emptyBody,
  footerHint = "Модель настраивается в Settings.",
  shortcutLabel,
}: AiChatPanelProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const localTextareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = inputRef ?? localTextareaRef;
  const showEmptyState = messages.length === 0 && !pendingAction;
  const themeMeta = AI_THEME_META[theme];
  const layout = getAiSurfaceLayout({
    mode,
    hasMessages: messages.length > 0,
    hasPendingAction: Boolean(pendingAction),
  });
  const compactFloatingHeader = mode === "floating" && layout.headerTone === "compact";
  const compactSurface = layout.stage === "active";
  const bubbleMaxWidthClassName =
    mode === "embedded" ? "max-w-[72%] xl:max-w-[52rem]" : "max-w-[27rem]";

  useEffect(() => {
    const node = composerRef.current;
    if (!node) {
      return;
    }

    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 168)}px`;
  }, [composerRef, inputValue]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    scroller.scrollTo({
      top: scroller.scrollHeight,
      behavior: getAiScrollBehavior({
        hasMessages: messages.length > 0,
        isStreaming,
      }),
    });
  }, [messages, isStreaming, pendingAction]);

  return (
    <section
      style={getAiThemeStyles(theme)}
      data-ai-mode={mode}
      data-ai-stage={layout.stage}
      data-ai-rail={layout.rail}
      data-ai-header-tone={layout.headerTone}
      data-ai-meta-tone={layout.metaTone}
      data-ai-composer-tone={layout.composerTone}
      data-ai-chip-flow={layout.chipFlow}
      className={`relative min-h-0 overflow-hidden border border-[var(--ai-border)] bg-[var(--ai-surface)] text-[var(--ai-text-primary)] ${
        mode === "floating"
          ? `${layout.widgetHeightClassName} rounded-[28px] shadow-[0_32px_90px_-42px_rgba(0,0,0,0.95)]`
          : "flex h-full flex-1 rounded-[20px] shadow-[0_28px_70px_-42px_rgba(0,0,0,0.88)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--ai-accent-soft),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_24%)]" />

      <LayoutGroup>
        <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">
          <div
            className={`flex h-full min-h-0 flex-col ${
              mode === "embedded"
                ? `w-full self-center ${layout.railMaxWidthClassName}`
                : "w-full"
            }`}
          >
            <motion.header
              layout="position"
              className={`border-b border-[var(--ai-border)] ${
                compactFloatingHeader ? "px-4 pb-2.5 pt-3 sm:px-4" : "px-4 pb-3 pt-4 sm:px-5"
              }`}
            >
              <motion.div layout="position" className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={`flex items-center ${compactFloatingHeader ? "gap-2" : "gap-3"}`}>
                    <span
                      className={`flex items-center justify-center rounded-full border border-[var(--ai-border)] bg-[var(--ai-accent-soft)] font-semibold uppercase text-[var(--ai-text-primary)] ${
                        compactFloatingHeader
                          ? "h-8 w-8 text-[10px] tracking-[0.16em]"
                          : "h-9 w-9 text-[11px] tracking-[0.18em]"
                      }`}
                    >
                      AI
                    </span>
                    <div className="min-w-0">
                      <div
                        className={`font-semibold tracking-[-0.02em] text-[var(--ai-text-primary)] ${
                          compactFloatingHeader ? "text-[14px]" : "text-[15px]"
                        }`}
                      >
                        {title}
                      </div>
                      {!compactFloatingHeader ? (
                        <div className="text-[12px] text-[var(--ai-text-muted)]">{subtitle}</div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--ai-text-dim)]">
                  <span
                    className={`inline-flex items-center rounded-full border border-[var(--ai-border)] bg-white/[0.03] ${layout.badgeSizeClassName}`}
                  >
                    {themeMeta.label}
                  </span>
                  {shortcutLabel ? (
                    <span
                      className={`inline-flex items-center rounded-full border border-[var(--ai-border)] bg-white/[0.03] ${layout.badgeSizeClassName}`}
                    >
                      {shortcutLabel}
                    </span>
                  ) : null}
                </div>
              </motion.div>

              <motion.div
                layout="position"
                className={`${compactFloatingHeader ? "mt-3" : "mt-4"} flex gap-2 ${
                  layout.chipFlow === "scroll"
                    ? "overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    : "flex-wrap"
                }`}
              >
                {chips.map((chip) => {
                  const active = chip.id === activeChipId;
                  return (
                    <motion.button
                      key={chip.id}
                      type="button"
                      onClick={() => onChipClick(chip.id, chip.prompt)}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border font-medium tracking-[0.01em] transition-colors ${
                        layout.chipSizeClassName
                      } ${
                        active
                          ? "border-[var(--ai-accent)] bg-[var(--ai-accent-soft)] text-[var(--ai-text-primary)]"
                          : "border-[var(--ai-border)] bg-white/[0.03] text-[var(--ai-text-secondary)] hover:border-[var(--ai-border-strong)] hover:text-[var(--ai-text-primary)]"
                      }`}
                    >
                      <span className="text-[11px] text-[var(--ai-accent)]">{chip.icon}</span>
                      <span>{chip.label}</span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.header>

            <div
              className={`flex min-h-0 flex-1 flex-col ${
                compactSurface ? "px-4 pb-3 pt-2.5 sm:px-5" : "px-4 pb-4 pt-3 sm:px-5"
              }`}
            >
              <motion.div
                layout="position"
                className={`${layout.metaTone === "compact" ? "mb-2" : "mb-3"} flex items-center justify-between gap-2 border border-[var(--ai-border)] bg-white/[0.03] ${
                  layout.metaTone === "compact"
                    ? "flex-wrap rounded-[18px] px-3 py-1.5 text-[10px] text-[var(--ai-text-muted)] sm:flex-nowrap"
                    : "flex-wrap rounded-full px-3 py-2 text-[11px] text-[var(--ai-text-muted)] sm:flex-nowrap"
                }`}
              >
                <span>Стриминг, markdown и подтверждения действий</span>
                <span className="text-[var(--ai-text-dim)]">OpenRouter настраивается в Settings</span>
              </motion.div>

              <div
                ref={scrollerRef}
                className={`min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-color:var(--ai-border)_transparent] [scrollbar-width:thin] ${
                  mode === "floating" && compactSurface ? "space-y-3 pt-1" : "space-y-4"
                }`}
              >
                {showEmptyState ? (
                  <div className="grid gap-3">
                    <div
                      className={`border border-[var(--ai-border)] bg-white/[0.02] ${
                        mode === "floating" ? "rounded-[24px] p-5" : "rounded-[26px] p-6"
                      }`}
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ai-text-dim)]">
                        Готов к работе
                      </p>
                      <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--ai-text-primary)]">
                        {emptyTitle}
                      </h3>
                      <p className="mt-2 max-w-[42rem] text-[14px] leading-[1.6] text-[var(--ai-text-muted)]">
                        {emptyBody}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {suggestions.map((suggestion, index) => (
                        <motion.button
                          key={suggestion.id}
                          type="button"
                          onClick={() => onSuggestionSelect(suggestion.prompt)}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.06, duration: 0.22 }}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.99 }}
                          className={`rounded-[20px] border border-[var(--ai-border)] bg-white/[0.03] text-left transition-colors hover:border-[var(--ai-border-strong)] ${
                            compactSurface ? "p-3.5" : "p-4"
                          }`}
                        >
                          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--ai-text-dim)]">
                            {suggestion.title}
                          </div>
                          <div className="mt-2 text-[13px] leading-[1.55] text-[var(--ai-text-secondary)]">
                            {suggestion.prompt}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <AnimatePresence initial={false} mode="popLayout">
                  {messages.map((message) => {
                    const assistant = message.role === "assistant";
                    const typingOnly = assistant && message.streaming && !message.text.trim();

                    return (
                      <motion.article
                        key={message.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className={`flex gap-3 ${assistant ? "justify-start" : "justify-end"}`}
                      >
                        {assistant ? (
                          <div
                            className={`flex shrink-0 items-center justify-center rounded-full border border-[var(--ai-border)] bg-[var(--ai-accent-soft)] font-semibold uppercase tracking-[0.14em] text-[var(--ai-text-primary)] ${
                              compactSurface ? "h-9 w-9 text-[10px]" : "h-10 w-10 text-[11px]"
                            }`}
                          >
                            AI
                          </div>
                        ) : null}

                        <div className={`w-full ${bubbleMaxWidthClassName} ${assistant ? "min-w-0" : "sm:w-auto"}`}>
                          <div className={`mb-1 text-[11px] ${assistant ? "text-[var(--ai-text-dim)]" : "text-right text-[var(--ai-text-dim)]"}`}>
                            {assistant ? "Ассистент" : "Вы"}
                          </div>
                          <div
                            className={`rounded-[22px] border px-4 py-3 ${
                              assistant
                                ? "border-[var(--ai-border)] bg-white/[0.03]"
                                : "border-[var(--ai-accent-strong)] bg-[var(--ai-accent-soft)]"
                            }`}
                          >
                            {assistant ? (
                              typingOnly ? (
                                <TypingIndicator />
                              ) : (
                                <ChatMarkdown content={message.text} isStreaming={message.streaming} />
                              )
                            ) : (
                              <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.65] text-[var(--ai-text-primary)]">
                                {message.text}
                              </p>
                            )}
                          </div>
                        </div>

                        {!assistant ? (
                          <div
                            className={`flex shrink-0 items-center justify-center rounded-full border border-[var(--ai-border)] bg-white/[0.04] font-semibold uppercase tracking-[0.14em] text-[var(--ai-text-secondary)] ${
                              compactSurface ? "h-9 w-9 text-[10px]" : "h-10 w-10 text-[11px]"
                            }`}
                          >
                            Вы
                          </div>
                        ) : null}
                      </motion.article>
                    );
                  })}
                </AnimatePresence>

                {pendingAction ? (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[22px] border border-[var(--ai-accent-strong)] bg-[var(--ai-accent-soft)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--ai-text-dim)]">
                          Требуется подтверждение
                        </div>
                        <div className="mt-2 text-[14px] font-medium leading-[1.6] text-[var(--ai-text-primary)]">
                          {pendingAction.summary}
                        </div>
                        <div className="mt-2 text-[12px] text-[var(--ai-text-muted)]">
                          Истекает: {new Date(pendingAction.expiresAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <motion.button
                          type="button"
                          onClick={() => void onResolveAction(true)}
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={isStreaming}
                          className="rounded-full border border-[var(--ai-border)] bg-[var(--ai-surface)] px-3 py-2 text-[12px] font-medium text-[var(--ai-text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Подтвердить
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={() => void onResolveAction(false)}
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={isStreaming}
                          className="rounded-full border border-[var(--ai-border)] bg-transparent px-3 py-2 text-[12px] font-medium text-[var(--ai-text-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Отклонить
                        </motion.button>
                      </div>
                    </div>

                    <pre className="mt-3 overflow-x-auto rounded-[16px] border border-[var(--ai-border)] bg-black/20 p-3 text-[11px] leading-[1.55] text-[var(--ai-text-secondary)]">
                      {JSON.stringify(pendingAction.arguments, null, 2)}
                    </pre>
                  </motion.div>
                ) : null}
              </div>

              <motion.div layout="position" className={compactSurface ? "mt-3" : "mt-4"}>
                <div
                  className={`border border-[var(--ai-border)] bg-[var(--ai-canvas)] shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-shadow focus-within:border-[var(--ai-accent)] focus-within:shadow-[0_0_28px_var(--ai-accent-soft)] ${
                    layout.composerTone === "compact"
                      ? "rounded-[22px] p-1.5"
                      : "rounded-[24px] p-2"
                  }`}
                >
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={composerRef}
                      value={inputValue}
                      onChange={(event) => onInputChange(event.target.value)}
                      onFocus={onInputFocus}
                      onBlur={onInputBlur}
                      onKeyDown={(event) => {
                        if (
                          shouldSubmitAiComposerKey({
                            key: event.key,
                            shiftKey: event.shiftKey,
                            nativeIsComposing: event.nativeEvent.isComposing,
                          })
                        ) {
                          event.preventDefault();
                          void onSubmit();
                        }
                      }}
                      rows={1}
                      spellCheck={false}
                      disabled={isStreaming}
                      placeholder={inputPlaceholder}
                      className={`max-h-40 flex-1 resize-none bg-transparent px-3 text-[14px] text-[var(--ai-text-primary)] outline-none placeholder:text-[var(--ai-text-dim)] disabled:cursor-not-allowed disabled:opacity-60 ${
                        layout.composerTone === "compact"
                          ? "min-h-[48px] py-[0.85rem] leading-[1.55]"
                          : "min-h-[52px] py-3 leading-[1.6]"
                      }`}
                    />

                    <motion.button
                      type="button"
                      onClick={() => void onSubmit()}
                      whileHover={!isStreaming && inputValue.trim() ? { y: -1 } : undefined}
                      whileTap={!isStreaming && inputValue.trim() ? { scale: 0.98 } : undefined}
                      disabled={isStreaming || !inputValue.trim()}
                      className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--ai-accent)] text-white shadow-[0_10px_30px_-16px_var(--ai-accent-glow)] transition-opacity disabled:cursor-not-allowed disabled:opacity-45 ${layout.composerButtonSizeClassName}`}
                      aria-label="Отправить сообщение"
                    >
                      <SendIcon />
                    </motion.button>
                  </div>
                </div>

                <div
                  className={`mt-2 grid gap-1 px-1 text-[var(--ai-text-dim)] sm:grid-cols-[1fr_auto] sm:items-center sm:gap-3 ${
                    compactSurface ? "text-[10px]" : "text-[11px]"
                  }`}
                >
                  <span>{footerHint}</span>
                  <span>Enter — отправить • Shift+Enter — новая строка</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </LayoutGroup>
    </section>
  );
}
