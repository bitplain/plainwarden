"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject, type SVGProps } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { AgentActionProposal } from "@/agent/types";
import type { AiTheme } from "@/components/ai-theme";
import ChatMarkdown from "@/components/ChatMarkdown";
import { getAiIThemeStyles } from "@/components/ai-chat/ai-i-theme";
import type { AiChatRuntimeMessage } from "@/components/ai-chat/runtime-store";

const VISUALIZER_LEVELS = [26, 44, 68, 82, 60, 38, 54, 76, 58, 34, 63, 79];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="h-2 w-2 rounded-full bg-white/70"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{
            duration: 1,
            repeat: Number.POSITIVE_INFINITY,
            delay: index * 0.14,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({
  children,
  className,
  viewBox = "0 0 24 24",
  ...props
}: IconProps & {
  children: ReactNode;
  viewBox?: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

function ArrowUpIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </IconBase>
  );
}

function BrainCogIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9.4 4.7A3.6 3.6 0 0 1 15.8 6a3.2 3.2 0 0 1 2.4 4.9A3.5 3.5 0 0 1 16.6 17H10a4 4 0 0 1-.6-7.9A4 4 0 0 1 9.4 4.7Z" />
      <circle cx="13.5" cy="11.5" r="2.1" />
      <path d="M13.5 8.2v1" />
      <path d="M13.5 13.8v1" />
      <path d="m10.8 11.5 1 0" />
      <path d="m15.2 11.5 1 0" />
    </IconBase>
  );
}

function FolderCodeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h3.2l2 2H18a2.5 2.5 0 0 1 2.5 2.5v6A2.5 2.5 0 0 1 18 18H6a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="m9.5 10.5-2 2 2 2" />
      <path d="m14.5 10.5 2 2-2 2" />
    </IconBase>
  );
}

function GlobeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.8 12h16.4" />
      <path d="M12 3.5a12.5 12.5 0 0 1 0 17" />
      <path d="M12 3.5a12.5 12.5 0 0 0 0 17" />
    </IconBase>
  );
}

function MicIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="9" y="4" width="6" height="10" rx="3" />
      <path d="M7 11.5a5 5 0 0 0 10 0" />
      <path d="M12 16.5V20" />
      <path d="M9 20h6" />
    </IconBase>
  );
}

function PaperclipIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8.5 12.5 15 6a3 3 0 1 1 4.2 4.2l-8.5 8.5a5 5 0 1 1-7.1-7.1l8.8-8.8" />
    </IconBase>
  );
}

function SquareIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="7" y="7" width="10" height="10" rx="1.8" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

function StopCircleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.2" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

function CloseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </IconBase>
  );
}

interface AiIChatSurfaceProps {
  messages: AiChatRuntimeMessage[];
  pendingAction: AgentActionProposal | null;
  isStreaming: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: (overrideText?: string) => Promise<void> | void;
  onResolveAction: (approved: boolean) => Promise<void> | void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  mode?: "embedded" | "floating";
  theme?: AiTheme;
}

interface UploadedPreview {
  fileName: string;
  url: string;
}

function formatComposerPlaceholder(input: {
  showSearch: boolean;
  showThink: boolean;
  showCanvas: boolean;
}): string {
  if (input.showSearch) {
    return "Search the web...";
  }
  if (input.showThink) {
    return "Think deeply...";
  }
  if (input.showCanvas) {
    return "Create on canvas...";
  }
  return "Type your message here...";
}

function formatMessageForSubmit(input: {
  rawText: string;
  preview: UploadedPreview | null;
  showSearch: boolean;
  showThink: boolean;
  showCanvas: boolean;
}): string {
  const trimmed = input.rawText.trim();
  const attachmentNote = input.preview ? `[Attached image: ${input.preview.fileName}]` : "";
  const composed = [trimmed, attachmentNote].filter(Boolean).join("\n\n").trim();

  if (!composed) {
    return "";
  }

  if (input.showSearch) {
    return `[Search: ${composed}]`;
  }
  if (input.showThink) {
    return `[Think: ${composed}]`;
  }
  if (input.showCanvas) {
    return `[Canvas: ${composed}]`;
  }
  return composed;
}

export default function AiIChatSurface({
  messages,
  pendingAction,
  isStreaming,
  inputValue,
  onInputChange,
  onSubmit,
  onResolveAction,
  inputRef,
  mode = "embedded",
  theme = "ambient",
}: AiIChatSurfaceProps) {
  const [preview, setPreview] = useState<UploadedPreview | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showThink, setShowThink] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const localInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = inputRef ?? localInputRef;
  const hasTranscript = messages.length > 0 || pendingAction !== null;
  const closeImagePreview = useCallback(() => {
    setSelectedImageUrl(null);
  }, []);

  useEffect(() => {
    const node = composerRef.current;
    if (!node) {
      return;
    }

    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 176)}px`;
  }, [composerRef, inputValue]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }

    node.scrollTo({
      top: node.scrollHeight,
      behavior: isStreaming ? "auto" : "smooth",
    });
  }, [messages, pendingAction, isStreaming]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }

    const timer = window.setInterval(() => {
      setRecordingSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (!item.type.startsWith("image/")) {
          continue;
        }

        const file = item.getAsFile();
        if (!file) {
          continue;
        }

        event.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          setPreview({
            fileName: file.name || "pasted-image.png",
            url: String(reader.result ?? ""),
          });
        };
        reader.readAsDataURL(file);
        break;
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  useEffect(() => {
    if (!selectedImageUrl) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeImagePreview();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeImagePreview, selectedImageUrl]);

  const actionLabel = useMemo(() => {
    if (isStreaming) {
      return "Stop generation";
    }
    if (isRecording) {
      return "Stop recording";
    }
    if (inputValue.trim() || preview) {
      return "Send message";
    }
    return "Voice message";
  }, [inputValue, isRecording, isStreaming, preview]);

  const placeholder = formatComposerPlaceholder({
    showSearch,
    showThink,
    showCanvas,
  });

  const submitCurrentComposer = async () => {
    const text = formatMessageForSubmit({
      rawText: inputValue,
      preview,
      showSearch,
      showThink,
      showCanvas,
    });
    if (!text) {
      return;
    }

    setPreview(null);
    await onSubmit(text);
  };

  const stopRecording = async () => {
    const duration = recordingSeconds;
    setIsRecording(false);
    await onSubmit(`[Voice message - ${duration} seconds]`);
  };

  const transcriptWidth = mode === "floating" ? "max-w-[34rem]" : "max-w-[46rem]";

  return (
    <section
        style={getAiIThemeStyles(theme)}
        className={cn(
          "relative min-h-0 overflow-hidden text-[var(--ai-i-shell-text)]",
          mode === "floating"
            ? "h-[46rem] max-h-[82dvh] rounded-[28px]"
            : "flex h-full flex-1 rounded-[28px]",
        )}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--ai-i-stage-top)_0%,var(--ai-i-stage-mid)_54%,rgba(244,182,123,0.88)_78%,var(--ai-i-stage-bottom)_100%)]" />
        <div className="absolute inset-x-[18%] bottom-[-18%] h-[56%] rounded-full bg-[radial-gradient(circle,var(--ai-i-stage-bottom)_0%,rgba(255,151,0,0.5)_42%,transparent_74%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_30%)]" />

        <div
          className={cn(
            "relative flex h-full min-h-0 flex-col",
            hasTranscript ? "px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6" : "p-5 sm:p-8",
          )}
        >
          {hasTranscript ? (
            <div
              ref={scrollerRef}
              className="mb-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 [scrollbar-color:rgba(25,25,32,0.45)_transparent] [scrollbar-width:thin]"
            >
              <AnimatePresence initial={false} mode="popLayout">
                {messages.map((message) => {
                  const assistant = message.role === "assistant";
                  const typingOnly = assistant && message.streaming && !message.text.trim();

                  return (
                    <motion.article
                      key={message.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className={cn("flex", assistant ? "justify-start" : "justify-end")}
                    >
                      <div
                        className={cn(
                          "w-full rounded-[24px] border px-4 py-3 shadow-[0_14px_30px_-18px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-5 sm:py-4",
                          transcriptWidth,
                          assistant
                            ? "border-white/12 bg-[rgba(20,21,28,0.72)]"
                            : "border-white/18 bg-[rgba(32,34,40,0.82)]",
                        )}
                      >
                        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/55">
                          {assistant ? "AI-I" : "Вы"}
                        </div>
                        {assistant ? (
                          typingOnly ? (
                            <TypingIndicator />
                          ) : (
                            <ChatMarkdown content={message.text} isStreaming={message.streaming} />
                          )
                        ) : (
                          <p className="whitespace-pre-wrap text-[14px] leading-[1.7] text-white/92">
                            {message.text}
                          </p>
                        )}
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>

              {pendingAction ? (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-auto max-w-[46rem] rounded-[28px] border border-white/14 bg-[rgba(17,18,24,0.82)] p-5 shadow-[0_20px_42px_-24px_rgba(0,0,0,0.42)] backdrop-blur-xl"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">
                        Требуется подтверждение
                      </div>
                      <div className="mt-2 text-[16px] font-medium text-white/96">
                        {pendingAction.summary}
                      </div>
                      <div className="mt-2 text-[12px] text-white/62">
                        Истекает: {new Date(pendingAction.expiresAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void onResolveAction(true)}
                        className="rounded-full bg-white px-3.5 py-2 text-[12px] font-medium text-[#17181d] transition-opacity hover:opacity-90"
                      >
                        Подтвердить
                      </button>
                      <button
                        type="button"
                        onClick={() => void onResolveAction(false)}
                        className="rounded-full border border-white/12 bg-white/5 px-3.5 py-2 text-[12px] font-medium text-white/74 transition-colors hover:bg-white/10"
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>

                  <pre className="mt-4 overflow-x-auto rounded-[20px] border border-white/10 bg-black/20 p-3 text-[11px] leading-[1.55] text-white/72">
                    {JSON.stringify(pendingAction.arguments, null, 2)}
                  </pre>
                </motion.div>
              ) : null}
            </div>
          ) : null}

          <div
            className={cn(
              "w-full",
              hasTranscript
                ? "mt-auto"
                : "flex min-h-0 flex-1 items-center justify-center",
            )}
          >
            <div
              className={cn(
                "mx-auto w-full",
                hasTranscript ? "max-w-[58rem]" : "max-w-[56rem]",
              )}
            >
              <div className="w-full rounded-[2.3rem] border border-[var(--ai-i-shell-border)] bg-[linear-gradient(135deg,rgba(21,22,28,0.96),rgba(16,17,23,0.94))] px-4 pb-4 pt-5 shadow-[0_30px_80px_-34px_rgba(0,0,0,0.55)] backdrop-blur-[18px]">
                {preview ? (
                  <div className="mb-3 flex">
                    <button
                      type="button"
                      onClick={() => setSelectedImageUrl(preview.url)}
                      className="group relative overflow-hidden rounded-[18px] border border-white/10"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview.url}
                        alt={preview.fileName}
                        className="h-20 w-20 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="sr-only">Open image preview</span>
                      <button
                        type="button"
                        aria-label="Remove uploaded image"
                        className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPreview(null);
                        }}
                      >
                        <CloseIcon className="h-3.5 w-3.5" />
                      </button>
                    </button>
                  </div>
                ) : null}

                {isRecording ? (
                  <div className="flex min-h-[7.5rem] flex-col items-center justify-center px-4 py-4">
                    <div className="mb-3 flex items-center gap-2 text-white/78">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5e5e] animate-pulse" />
                      <span className="font-mono text-sm">
                        {`${Math.floor(recordingSeconds / 60)
                          .toString()
                          .padStart(2, "0")}:${(recordingSeconds % 60)
                          .toString()
                          .padStart(2, "0")}`}
                      </span>
                    </div>
                    <div className="flex h-10 w-full max-w-[32rem] items-end justify-center gap-1 px-2">
                      {VISUALIZER_LEVELS.map((level, index) => (
                        <motion.span
                          key={`${level}-${index}`}
                          className="w-1 rounded-full bg-white/60"
                          animate={{ height: [`${Math.max(18, level - 8)}%`, `${level}%`, `${Math.max(22, level - 4)}%`] }}
                          transition={{
                            duration: 0.9 + (index % 3) * 0.12,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <textarea
                    ref={composerRef}
                    value={inputValue}
                    onChange={(event) => onInputChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void submitCurrentComposer();
                      }
                    }}
                    rows={1}
                    spellCheck={false}
                    disabled={isStreaming}
                    placeholder={placeholder}
                    className="min-h-[7rem] max-h-44 w-full resize-none bg-transparent px-3 text-[clamp(1.8rem,2.1vw,2.25rem)] leading-[1.25] tracking-[-0.04em] text-[var(--ai-i-shell-text)] outline-none placeholder:text-white/58 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                )}

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1 text-[var(--ai-i-shell-muted)]">
                    <button
                      type="button"
                      aria-label="Upload image"
                      title="Upload image"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/8 hover:text-white"
                    >
                      <PaperclipIcon className="h-5 w-5" />
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          return;
                        }

                        const reader = new FileReader();
                        reader.onload = () => {
                          setPreview({
                            fileName: file.name,
                            url: String(reader.result ?? ""),
                          });
                        };
                        reader.readAsDataURL(file);
                        event.target.value = "";
                      }}
                    />

                    <div className="flex items-center rounded-full bg-black/15 px-1 py-1">
                      {[
                        {
                          id: "search",
                          label: "Search",
                          active: showSearch,
                          onClick: () => {
                            setShowSearch((value) => !value);
                            setShowThink(false);
                          },
                          icon: GlobeIcon,
                        },
                        {
                          id: "think",
                          label: "Think",
                          active: showThink,
                          onClick: () => {
                            setShowThink((value) => !value);
                            setShowSearch(false);
                          },
                          icon: BrainCogIcon,
                        },
                        {
                          id: "canvas",
                          label: "Canvas",
                          active: showCanvas,
                          onClick: () => {
                            setShowCanvas((value) => !value);
                          },
                          icon: FolderCodeIcon,
                        },
                      ].map((item, index) => {
                        const Icon = item.icon;
                        return (
                          <React.Fragment key={item.id}>
                            {index > 0 ? (
                              <span className="mx-1 h-8 w-px rounded-full bg-[linear-gradient(180deg,transparent,var(--ai-i-divider),transparent)]" />
                            ) : null}

                            <button
                              type="button"
                              aria-label={item.label}
                              onClick={item.onClick}
                              className={cn(
                                "inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 transition-colors",
                                item.active
                                  ? "bg-white/10 text-white"
                                  : "text-[var(--ai-i-shell-muted)] hover:bg-white/8 hover:text-white",
                              )}
                            >
                              <motion.span
                                animate={{
                                  rotate: item.active ? 360 : 0,
                                  scale: item.active ? 1.05 : 1,
                                }}
                                transition={{ duration: 0.35, ease: "easeOut" }}
                              >
                                <Icon className="h-4.5 w-4.5" />
                              </motion.span>
                              <AnimatePresence initial={false}>
                                {item.active ? (
                                  <motion.span
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: "auto", opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    className="overflow-hidden whitespace-nowrap text-xs"
                                  >
                                    {item.label}
                                  </motion.span>
                                ) : null}
                              </AnimatePresence>
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label={actionLabel}
                    onClick={() => {
                      if (isStreaming) {
                        return;
                      }
                      if (isRecording) {
                        void stopRecording();
                        return;
                      }
                      if (inputValue.trim() || preview) {
                        void submitCurrentComposer();
                        return;
                      }
                      setIsRecording(true);
                    }}
                    className={cn(
                      "inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-[0_18px_42px_-20px_rgba(0,0,0,0.4)] transition-transform hover:scale-[1.02]",
                      isRecording
                        ? "bg-[#1b1d22] text-[#ff5e5e]"
                        : inputValue.trim() || preview || isStreaming
                          ? "bg-white text-[#1b1d22]"
                          : "bg-white text-[#1b1d22]",
                    )}
                  >
                    {isStreaming ? (
                      <SquareIcon className="h-4 w-4" />
                    ) : isRecording ? (
                      <StopCircleIcon className="h-6 w-6" />
                    ) : inputValue.trim() || preview ? (
                      <ArrowUpIcon className="h-5 w-5" />
                    ) : (
                      <MicIcon className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedImageUrl ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            onClick={closeImagePreview}
          >
            <div
              className="relative w-[min(90vw,56rem)] overflow-hidden rounded-[28px] border border-white/10 bg-[#13141a] p-0 shadow-2xl outline-none"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close image preview"
                onClick={closeImagePreview}
                className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/72"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImageUrl}
                alt="Uploaded preview"
                className="max-h-[80vh] w-full object-contain"
              />
            </div>
          </div>
        ) : null}
      </section>
  );
}
