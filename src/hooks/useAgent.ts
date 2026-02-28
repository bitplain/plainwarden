"use client";

import { useCallback, useMemo, useState } from "react";
import type { AgentActionProposal, AgentMemoryItem, AgentMessage, AgentSettings } from "@/agent/types";

export interface AgentUIMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}

interface UseAgentOptions {
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

function readSettings(): AgentSettings {
  if (typeof window === "undefined") {
    return {
      profile: {
        name: "Нова",
        style: "balanced",
        adaptTone: true,
      },
    };
  }

  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) {
    return {
      profile: {
        name: "Нова",
        style: "balanced",
        adaptTone: true,
      },
    };
  }

  try {
    const parsed = JSON.parse(raw) as AgentSettings;
    if (!parsed?.profile?.name) throw new Error("invalid settings");
    return parsed;
  } catch {
    return {
      profile: {
        name: "Нова",
        style: "balanced",
        adaptTone: true,
      },
    };
  }
}

function saveSettings(value: AgentSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(value));
}

function toAgentHistory(messages: AgentUIMessage[]): AgentMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.text,
  }));
}

function parseSsePacket(packet: string): { event: string; data: unknown } | null {
  const lines = packet.split("\n");
  const eventLine = lines.find((line) => line.startsWith("event:"));
  const dataLine = lines.find((line) => line.startsWith("data:"));
  if (!eventLine || !dataLine) return null;

  const event = eventLine.replace("event:", "").trim();
  const rawData = dataLine.replace("data:", "").trim();

  try {
    return {
      event,
      data: JSON.parse(rawData),
    };
  } catch {
    return null;
  }
}

export function useAgent(options: UseAgentOptions = {}) {
  const [messages, setMessages] = useState<AgentUIMessage[]>([]);
  const [pendingAction, setPendingAction] = useState<AgentActionProposal | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [settings, setSettingsState] = useState<AgentSettings>(readSettings);

  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "server";
    const key = "netden:agent:session";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const next = crypto.randomUUID();
    window.localStorage.setItem(key, next);
    return next;
  }, []);

  const setSettings = useCallback((next: AgentSettings) => {
    setSettingsState(next);
    saveSettings(next);
  }, []);

  const pushUserMessage = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        text,
      },
    ]);
  }, []);

  const pushAssistantMessage = useCallback(() => {
    const id = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id,
        role: "assistant",
        text: "",
        streaming: true,
      },
    ]);
    return id;
  }, []);

  const appendAssistantText = useCallback((id: string, text: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id
          ? {
              ...message,
              text: `${message.text}${text}`,
            }
          : message,
      ),
    );
  }, []);

  const completeAssistantMessage = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id
          ? {
              ...message,
              streaming: false,
            }
          : message,
      ),
    );
  }, []);

  const streamRequest = useCallback(
    async (payload: StreamPayload) => {
      setIsStreaming(true);
      const assistantId = pushAssistantMessage();

      try {
        const response = await fetch("/api/stream", {
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
          if (done) break;

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
                setPendingAction(payloadData.payload as AgentActionProposal);
              }

              if (parsed.event === "navigate") {
                const path =
                  payloadData?.payload && typeof (payloadData.payload as { path?: unknown }).path === "string"
                    ? ((payloadData.payload as { path: string }).path)
                    : undefined;
                if (path && options.onNavigate) {
                  options.onNavigate(path);
                }
              }

              if (parsed.event === "error") {
                const message =
                  typeof payloadData?.message === "string" ? payloadData.message : "Agent stream error";
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
        setIsStreaming(false);
      }
    },
    [appendAssistantText, completeAssistantMessage, options, pushAssistantMessage],
  );

  const sendMessage = useCallback(
    async (text: string, memory: AgentMemoryItem[]) => {
      pushUserMessage(text);

      const history = toAgentHistory([
        ...messages,
        {
          id: crypto.randomUUID(),
          role: "user",
          text,
        },
      ]);

      await streamRequest({
        message: text,
        sessionId,
        history,
        memory,
        settings,
      });
    },
    [messages, sessionId, settings, pushUserMessage, streamRequest],
  );

  const resolveAction = useCallback(
    async (approved: boolean, memory: AgentMemoryItem[]) => {
      if (!pendingAction) return;

      const history = toAgentHistory(messages);
      await streamRequest({
        sessionId,
        history,
        memory,
        settings,
        actionDecision: {
          actionId: pendingAction.id,
          approved,
        },
      });

      setPendingAction(null);
    },
    [messages, pendingAction, sessionId, settings, streamRequest],
  );

  return {
    messages,
    isStreaming,
    pendingAction,
    settings,
    setSettings,
    sendMessage,
    resolveAction,
  };
}
