"use client";

import { useEffect, useRef, useState } from "react";
import {
  useAiChatRuntime,
  useAiChatRuntimeActions,
} from "@/components/ai-chat/AiChatProvider";
import AiIChatSurface from "@/components/ai-chat/AiIChatSurface";
import { readAiTheme, subscribeAiTheme, type AiTheme } from "@/components/ai-theme";
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

  useEffect(() => subscribeAiTheme(setTheme), []);

  return (
    <main
      data-ai-i-page="standalone"
      className="min-h-dvh bg-[#0f1014] text-white"
    >
      <div className="relative flex min-h-dvh flex-col">
        <header className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
          <WorkspaceTopNav
            activeId="ai-i"
            items={[
              { id: "ai-i", label: "AI-I", href: "/ai-i", active: true },
              { id: "calendar", label: "Календарь", href: "/calendar" },
              { id: "ai", label: "AI", href: "/" },
              { id: "kanban", label: "Канбан", href: "/calendar?tab=kanban" },
              { id: "notes", label: "Заметки", href: "/calendar?tab=notes" },
            ]}
          />
        </header>

        <div
          data-ai-i-stage="centered"
          className="flex w-full flex-1 items-center justify-center px-0 pb-0 pt-2 sm:px-0 sm:pt-3"
        >
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
