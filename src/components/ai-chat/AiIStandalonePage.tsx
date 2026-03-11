"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  useAiChatRuntime,
  useAiChatRuntimeActions,
} from "@/components/ai-chat/AiChatProvider";
import AiIChatSurface from "@/components/ai-chat/AiIChatSurface";
import { readAiTheme, subscribeAiTheme, type AiTheme } from "@/components/ai-theme";
import { CALENDAR2_LINEAR_VARS } from "@/components/calendar2/calendar2-theme";
import WorkspaceTopNav from "@/components/workspace/WorkspaceTopNav";

export default function AiIStandalonePage() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [theme, setTheme] = useState<AiTheme>(() => readAiTheme());
  const messages = useAiChatRuntime((state) => state.messages);
  const pendingAction = useAiChatRuntime((state) => state.pendingAction);
  const isStreaming = useAiChatRuntime((state) => state.isStreaming);
  const inputValue = useAiChatRuntime((state) => state.inputValue);
  const setInputValue = useAiChatRuntime((state) => state.setInputValue);
  const { submitCurrentInput, resolvePendingAction } = useAiChatRuntimeActions();
  const workspaceNavItems = [
    { id: "ai-i", label: "AI-I", href: "/" },
    { id: "calendar", label: "Календарь", href: "/calendar" },
    { id: "kanban", label: "Канбан", href: "/calendar?tab=kanban" },
    { id: "notes", label: "Заметки", href: "/calendar?tab=notes" },
    { id: "ai", label: "AI", href: "/ai" },
  ];

  useEffect(() => subscribeAiTheme(setTheme), []);

  return (
    <main
      style={CALENDAR2_LINEAR_VARS}
      data-ai-i-page="standalone"
      className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(94,106,210,0.1),transparent_24%),linear-gradient(180deg,#08080a,#121216)] font-[family-name:var(--font-geist-sans)] text-[var(--cal2-text-primary)]"
    >
      <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col px-3 pb-6 pt-4 sm:px-5 lg:px-6">
        <header className="rounded-[30px] border border-[var(--cal2-border)] bg-[rgba(10,10,12,0.84)] px-4 py-4 shadow-[0_30px_90px_-58px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <WorkspaceTopNav activeId="ai-i" items={workspaceNavItems} />

            <Link
              href="/settings"
              className="rounded-full border border-[var(--cal2-border)] bg-transparent px-3 py-2 text-[12px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
            >
              Settings
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-[44rem]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--cal2-text-secondary)]">
                Primary workspace
              </p>
              <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.05em] text-[var(--cal2-text-primary)] sm:text-[42px]">
                AI-I
              </h1>
              <p className="mt-3 max-w-[40rem] text-[13px] leading-[1.7] text-[rgba(240,240,240,0.68)]">
                Главная AI-страница в общем workspace-shell: тот же ритм, тот же top-nav, но с более
                сфокусированным и быстрым composer-потоком.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--cal2-text-secondary)]">
              <span className="rounded-full border border-[rgba(94,106,210,0.24)] bg-[rgba(94,106,210,0.1)] px-3 py-1.5 text-[var(--cal2-text-primary)]">
                Default route
              </span>
              <span className="rounded-full border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[var(--cal2-text-primary)]">
                /
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-[var(--cal2-text-secondary)]">
            <span>AI-I открывается первым после входа</span>
            <span className="text-[rgba(255,255,255,0.18)]">•</span>
            <span>Остальные workspace-страницы остаются в той же общей строке</span>
            <span className="text-[rgba(255,255,255,0.18)]">•</span>
            <span>Композиция сохранена, шум убран</span>
          </div>
        </header>

        <div data-ai-i-stage="centered" className="mt-4 flex min-h-0 flex-1">
          <AiIChatSurface
            mode="standalone"
            theme={theme}
            messages={messages}
            pendingAction={pendingAction}
            isStreaming={isStreaming}
            inputValue={inputValue}
            inputRef={inputRef}
            onInputChange={setInputValue}
            onSubmit={submitCurrentInput}
            onResolveAction={resolvePendingAction}
          />
        </div>
      </div>
    </main>
  );
}
