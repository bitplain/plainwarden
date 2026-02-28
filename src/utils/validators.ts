import type { AgentActionDecision, AgentMemoryItem, AgentMessage, AgentSettings, AgentTurnInput } from "@/agent/types";
import { HttpError } from "@/lib/server/validators";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, field: string, required = true): string {
  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) {
      return "";
    }
    throw new HttpError(400, `${field} must be a string`);
  }

  const trimmed = value.trim();
  if (required && !trimmed) {
    throw new HttpError(400, `${field} is required`);
  }
  return trimmed;
}

function readBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new HttpError(400, `${field} must be a boolean`);
  }
  return value;
}

function parseHistory(value: unknown): AgentMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const role = readString(item.role, "history.role") as AgentMessage["role"];
      if (!["system", "user", "assistant", "tool"].includes(role)) {
        throw new HttpError(400, "history.role is invalid");
      }

      return {
        role,
        content: readString(item.content, "history.content"),
        name: typeof item.name === "string" ? item.name : undefined,
        toolCallId: typeof item.toolCallId === "string" ? item.toolCallId : undefined,
      };
    });
}

function parseMemory(value: unknown): AgentMemoryItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => ({
      id: readString(item.id, "memory.id"),
      value: readString(item.value, "memory.value"),
      pinned: typeof item.pinned === "boolean" ? item.pinned : false,
      updatedAt: readString(item.updatedAt, "memory.updatedAt"),
    }));
}

function parseSettings(value: unknown): AgentSettings {
  if (!isRecord(value)) {
    return {
      profile: {
        name: "Нова",
        style: "balanced",
        adaptTone: true,
      },
    };
  }

  const profileRaw = isRecord(value.profile) ? value.profile : {};
  const styleRaw = typeof profileRaw.style === "string" ? profileRaw.style : "balanced";
  const style = (["friendly", "balanced", "formal"] as const).includes(
    styleRaw as "friendly" | "balanced" | "formal",
  )
    ? (styleRaw as "friendly" | "balanced" | "formal")
    : "balanced";

  return {
    profile: {
      name: typeof profileRaw.name === "string" && profileRaw.name.trim() ? profileRaw.name.trim() : "Нова",
      style,
      adaptTone: typeof profileRaw.adaptTone === "boolean" ? profileRaw.adaptTone : true,
    },
    role: typeof value.role === "string" ? value.role.trim() : undefined,
  };
}

function parseActionDecision(value: unknown): AgentActionDecision | undefined {
  if (!isRecord(value)) return undefined;
  return {
    actionId: readString(value.actionId, "actionDecision.actionId"),
    approved: readBoolean(value.approved, "actionDecision.approved"),
  };
}

export function parseAgentTurnInput(body: unknown): AgentTurnInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Invalid payload");
  }

  return {
    message: typeof body.message === "string" ? body.message : undefined,
    sessionId: readString(body.sessionId, "sessionId"),
    history: parseHistory(body.history),
    memory: parseMemory(body.memory),
    settings: parseSettings(body.settings),
    actionDecision: parseActionDecision(body.actionDecision),
  };
}
