"use client";

import { createStore, type StoreApi } from "zustand/vanilla";
import type {
  AgentActionProposal,
  AgentMemoryItem,
  AgentMessage,
  AgentSettings,
} from "@/agent/types";
import { createRandomId } from "@/lib/random-id";

export interface AiChatRuntimeMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}

export interface AiChatRuntimeStoreState {
  messages: AiChatRuntimeMessage[];
  pendingAction: AgentActionProposal | null;
  isStreaming: boolean;
  settings: AgentSettings;
  inputValue: string;
  activeChipId: string | null;
  setSettings: (next: AgentSettings) => void;
  setInputValue: (value: string) => void;
  toggleChip: (chipId: string, prompt: string) => void;
  selectSuggestion: (prompt: string) => void;
  clearComposer: () => void;
  sendMessage: (text: string, memory: AgentMemoryItem[]) => Promise<void>;
  resolveAction: (approved: boolean, memory: AgentMemoryItem[]) => Promise<void>;
}

export type AiChatRuntimeStore = StoreApi<AiChatRuntimeStoreState>;

interface AiChatRuntimeStoreOptions {
  fetchFn?: typeof fetch;
  sessionId?: string;
  initialSettings?: AgentSettings;
  onNavigate?: (path: string) => void;
}

interface StreamPayload {
  message?: string;
  sessionId: string;
  history: AgentMessage[];
  memory: AgentMemoryItem[];
  settings: AgentSettings;
  actionDecision?: {
    actionId: string;
    approved: boolean;
  };
}

const SETTINGS_STORAGE_KEY = "netden:agent:settings";
const SESSION_STORAGE_KEY = "netden:agent:session";

function getDefaultAgentSettings(): AgentSettings {
  return {
    profile: {
      name: "Нова",
      style: "balanced",
      adaptTone: true,
    },
  };
}

function readSettings(initialSettings?: AgentSettings): AgentSettings {
  if (initialSettings) {
    return initialSettings;
  }

  if (typeof window === "undefined") {
    return getDefaultAgentSettings();
  }

  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) {
    return getDefaultAgentSettings();
  }

  try {
    const parsed = JSON.parse(raw) as AgentSettings;
    if (!parsed?.profile?.name) {
      throw new Error("invalid settings");
    }
    return parsed;
  } catch {
    return getDefaultAgentSettings();
  }
}

function saveSettings(value: AgentSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(value));
}

function readSessionId(explicitSessionId?: string): string {
  if (explicitSessionId) {
    return explicitSessionId;
  }

  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const next = createRandomId();
  window.localStorage.setItem(SESSION_STORAGE_KEY, next);
  return next;
}

function toAgentHistory(messages: AiChatRuntimeMessage[]): AgentMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.text,
  }));
}

function parseSsePacket(packet: string): { event: string; data: unknown } | null {
  const lines = packet.split("\n");
  const eventLine = lines.find((line) => line.startsWith("event:"));
  const dataLine = lines.find((line) => line.startsWith("data:"));
  if (!eventLine || !dataLine) {
    return null;
  }

  try {
    return {
      event: eventLine.replace("event:", "").trim(),
      data: JSON.parse(dataLine.replace("data:", "").trim()),
    };
  } catch {
    return null;
  }
}

export function createAiChatRuntimeStore(
  options: AiChatRuntimeStoreOptions = {},
): AiChatRuntimeStore {
  const fetchFn = options.fetchFn ?? fetch;
  const sessionId = readSessionId(options.sessionId);

  const store = createStore<AiChatRuntimeStoreState>((set, get) => {
    const pushAssistantMessage = () => {
      const id = createRandomId();
      set((state) => ({
        ...state,
        messages: [
          ...state.messages,
          {
            id,
            role: "assistant",
            text: "",
            streaming: true,
          },
        ],
      }));
      return id;
    };

    const appendAssistantText = (id: string, text: string) => {
      set((state) => ({
        ...state,
        messages: state.messages.map((message) =>
          message.id === id
            ? {
                ...message,
                text: `${message.text}${text}`,
              }
            : message,
        ),
      }));
    };

    const completeAssistantMessage = (id: string) => {
      set((state) => ({
        ...state,
        messages: state.messages.map((message) =>
          message.id === id
            ? {
                ...message,
                streaming: false,
              }
            : message,
        ),
      }));
    };

    const streamRequest = async (payload: StreamPayload) => {
      set((state) => ({
        ...state,
        isStreaming: true,
      }));
      const assistantId = pushAssistantMessage();

      try {
        const response = await fetchFn("/api/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-netden-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok || !response.body) {
          throw new Error(`Agent stream failed (HTTP ${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          let separatorIndex = buffer.indexOf("\n\n");
          while (separatorIndex >= 0) {
            const packet = buffer.slice(0, separatorIndex);
            buffer = buffer.slice(separatorIndex + 2);

            const parsed = parseSsePacket(packet);
            if (parsed) {
              const payloadData =
                parsed.data && typeof parsed.data === "object"
                  ? (parsed.data as Record<string, unknown>)
                  : null;

              if (parsed.event === "token") {
                const text =
                  typeof payloadData?.text === "string"
                    ? payloadData.text
                    : typeof payloadData?.data === "string"
                      ? payloadData.data
                      : "";
                appendAssistantText(assistantId, text);
              }

              if (parsed.event === "action" && payloadData?.payload) {
                set((state) => ({
                  ...state,
                  pendingAction: payloadData.payload as AgentActionProposal,
                }));
              }

              if (parsed.event === "navigate") {
                const path =
                  payloadData?.payload &&
                  typeof (payloadData.payload as { path?: unknown }).path === "string"
                    ? (payloadData.payload as { path: string }).path
                    : undefined;

                if (path) {
                  options.onNavigate?.(path);
                }
              }

              if (parsed.event === "error") {
                const message =
                  typeof payloadData?.message === "string"
                    ? payloadData.message
                    : "Agent stream error";
                appendAssistantText(assistantId, message);
              }
            }

            separatorIndex = buffer.indexOf("\n\n");
          }
        }

        completeAssistantMessage(assistantId);
      } catch (error) {
        appendAssistantText(
          assistantId,
          error instanceof Error ? error.message : "Unexpected streaming error",
        );
        completeAssistantMessage(assistantId);
      } finally {
        set((state) => ({
          ...state,
          isStreaming: false,
        }));
      }
    };

    return {
      messages: [],
      pendingAction: null,
      isStreaming: false,
      settings: readSettings(options.initialSettings),
      inputValue: "",
      activeChipId: null,
      setSettings: (next) => {
        saveSettings(next);
        set((state) => ({
          ...state,
          settings: next,
        }));
      },
      setInputValue: (value) => {
        set((state) => ({
          ...state,
          inputValue: value,
          activeChipId: null,
        }));
      },
      toggleChip: (chipId, prompt) => {
        set((state) => {
          const nextChipId = state.activeChipId === chipId ? null : chipId;
          return {
            ...state,
            activeChipId: nextChipId,
            inputValue: nextChipId ? prompt : "",
          };
        });
      },
      selectSuggestion: (prompt) => {
        set((state) => ({
          ...state,
          activeChipId: null,
          inputValue: prompt,
        }));
      },
      clearComposer: () => {
        set((state) => ({
          ...state,
          inputValue: "",
          activeChipId: null,
        }));
      },
      sendMessage: async (text, memory) => {
        set((state) => ({
          ...state,
          messages: [
            ...state.messages,
            {
              id: createRandomId(),
              role: "user",
              text,
            },
          ],
        }));

        await streamRequest({
          message: text,
          sessionId,
          history: toAgentHistory(get().messages),
          memory,
          settings: get().settings,
        });
      },
      resolveAction: async (approved, memory) => {
        const pendingAction = get().pendingAction;
        if (!pendingAction) {
          return;
        }

        await streamRequest({
          sessionId,
          history: toAgentHistory(get().messages),
          memory,
          settings: get().settings,
          actionDecision: {
            actionId: pendingAction.id,
            approved,
          },
        });

        set((state) => ({
          ...state,
          pendingAction: null,
        }));
      },
    };
  });

  return store;
}
