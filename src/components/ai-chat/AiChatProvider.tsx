"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useStore } from "zustand";
import type { AgentMemoryItem } from "@/agent/types";
import { useAgentMemory } from "@/hooks/useAgentMemory";
import {
  createAiChatRuntimeStore,
  type AiChatRuntimeStore,
  type AiChatRuntimeStoreState,
} from "@/components/ai-chat/runtime-store";

interface AiChatRuntimeContextValue {
  store: AiChatRuntimeStore;
  submitCurrentInput: (overrideText?: string) => Promise<void>;
  resolvePendingAction: (approved: boolean) => Promise<void>;
}

const AiChatRuntimeContext = createContext<AiChatRuntimeContextValue | null>(null);

export function AiChatProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { items: memoryItems } = useAgentMemory();
  const storeRef = useRef<AiChatRuntimeStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createAiChatRuntimeStore({
      onNavigate: (path) => {
        router.push(path);
      },
    });
  }

  const submitCurrentInput = useCallback(async (overrideText?: string) => {
    const store = storeRef.current;
    if (!store) {
      return;
    }

    const state = store.getState();
    const text = (overrideText ?? state.inputValue).trim();
    if (!text || state.isStreaming) {
      return;
    }

    state.clearComposer();
    await state.sendMessage(text, memoryItems as AgentMemoryItem[]);
  }, [memoryItems]);

  const resolvePendingAction = useCallback(
    async (approved: boolean) => {
      const store = storeRef.current;
      if (!store) {
        return;
      }

      await store.getState().resolveAction(approved, memoryItems as AgentMemoryItem[]);
    },
    [memoryItems],
  );

  const value = useMemo(
    () => ({
      store: storeRef.current as AiChatRuntimeStore,
      submitCurrentInput,
      resolvePendingAction,
    }),
    [submitCurrentInput, resolvePendingAction],
  );

  return (
    <AiChatRuntimeContext.Provider value={value}>
      {children}
    </AiChatRuntimeContext.Provider>
  );
}

function useAiChatRuntimeContext(): AiChatRuntimeContextValue {
  const context = useContext(AiChatRuntimeContext);
  if (!context) {
    throw new Error("useAiChatRuntime must be used within AiChatProvider");
  }
  return context;
}

export function useAiChatRuntime<T>(
  selector: (state: AiChatRuntimeStoreState) => T,
): T {
  const { store } = useAiChatRuntimeContext();
  return useStore(store, selector);
}

export function useAiChatRuntimeActions() {
  const { submitCurrentInput, resolvePendingAction } = useAiChatRuntimeContext();
  return {
    submitCurrentInput,
    resolvePendingAction,
  };
}
