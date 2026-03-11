"use client";

import { useEffect, useRef, useState } from "react";
import {
  useAiChatRuntime,
  useAiChatRuntimeActions,
} from "@/components/ai-chat/AiChatProvider";
import AiIChatSurface from "@/components/ai-chat/AiIChatSurface";
import { readAiTheme, subscribeAiTheme, type AiTheme } from "@/components/ai-theme";

export default function Calendar2AiIPanel() {
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
    <AiIChatSurface
      mode="embedded"
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
  );
}
