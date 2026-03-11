"use client";

import { useEffect, useRef, useState } from "react";
import {
  useAiChatRuntime,
  useAiChatRuntimeActions,
} from "@/components/ai-chat/AiChatProvider";
import AiIChatSurface from "@/components/ai-chat/AiIChatSurface";
import { readAiTheme, subscribeAiTheme, type AiTheme } from "@/components/ai-theme";

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
      className="flex min-h-0 flex-1 flex-col bg-[transparent] text-white"
    >
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
    </main>
  );
}
