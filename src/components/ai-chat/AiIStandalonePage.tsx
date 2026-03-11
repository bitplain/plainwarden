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
    <section data-ai-i-page="standalone" className="flex min-h-0 flex-1">
      <div data-ai-i-stage="centered" className="flex min-h-0 w-full flex-1">
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
    </section>
  );
}
