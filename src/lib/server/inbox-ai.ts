import { format, isValid, parseISO } from "date-fns";
import type { InboxAiAnalysis, InboxAiRecommendedTarget, InboxItem } from "@/lib/types";
import prisma from "@/lib/server/prisma";
import { getOpenRouterRuntimeConfig } from "@/lib/server/openrouter-settings";
import { HttpError } from "@/lib/server/validators";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface OpenRouterChatMessage {
  content?: string | Array<{ type?: string; text?: string }>;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: OpenRouterChatMessage;
  }>;
}

export class InboxAiAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InboxAiAnalysisError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeDate(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (!ISO_DATE_REGEX.test(normalized)) {
    return undefined;
  }

  const parsed = parseISO(normalized);
  if (!isValid(parsed)) {
    return undefined;
  }

  return format(parsed, "yyyy-MM-dd") === normalized ? normalized : undefined;
}

function normalizeTarget(value: unknown): InboxAiRecommendedTarget {
  return value === "task" || value === "event" || value === "note" || value === "keep"
    ? value
    : "keep";
}

function normalizeRationale(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2);
}

function stripCodeFence(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() || trimmed;
}

function readResponseContent(payload: unknown): string {
  if (!isRecord(payload)) {
    throw new InboxAiAnalysisError("Inbox AI response payload is invalid");
  }

  const firstChoice = Array.isArray(payload.choices) ? payload.choices[0] : undefined;
  const message = isRecord(firstChoice) ? firstChoice.message : undefined;
  if (!isRecord(message)) {
    throw new InboxAiAnalysisError("Inbox AI response did not include a message");
  }

  if (typeof message.content === "string") {
    return stripCodeFence(message.content);
  }

  if (Array.isArray(message.content)) {
    const text = message.content
      .filter((part): part is { type?: string; text?: string } => isRecord(part))
      .map((part) => (part.type === "text" && typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();
    if (text) {
      return stripCodeFence(text);
    }
  }

  throw new InboxAiAnalysisError("Inbox AI response content was empty");
}

export function normalizeInboxAiAnalysisPayload(itemId: string, payload: unknown): InboxAiAnalysis {
  if (!isRecord(payload)) {
    throw new InboxAiAnalysisError("Inbox AI response must be an object");
  }

  const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";
  if (!summary) {
    throw new InboxAiAnalysisError("Inbox AI response must include a summary");
  }

  const analysis: InboxAiAnalysis = {
    itemId,
    summary,
    recommendedTarget: normalizeTarget(payload.recommendedTarget),
    rationale: normalizeRationale(payload.rationale),
  };

  const suggestedDate = normalizeDate(payload.suggestedDate);
  const suggestedDueDate = normalizeDate(payload.suggestedDueDate);
  if (suggestedDate) {
    analysis.suggestedDate = suggestedDate;
  }
  if (suggestedDueDate) {
    analysis.suggestedDueDate = suggestedDueDate;
  }
  if (typeof payload.suggestedPriority === "boolean") {
    analysis.suggestedPriority = payload.suggestedPriority;
  }

  return analysis;
}

export function parseInboxAiResponse(itemId: string, content: string): InboxAiAnalysis {
  const normalized = content.trim();
  if (!normalized) {
    throw new InboxAiAnalysisError("Inbox AI response content was empty");
  }

  try {
    return normalizeInboxAiAnalysisPayload(itemId, JSON.parse(stripCodeFence(normalized)));
  } catch (error) {
    if (error instanceof InboxAiAnalysisError) {
      throw error;
    }
    throw new InboxAiAnalysisError("Inbox AI response was not valid JSON");
  }
}

function buildSystemPrompt() {
  return [
    "Ты помогаешь разобрать один Inbox item в ADHD planner.",
    "Верни только JSON object без markdown, без пояснений и без code fences.",
    "Поля ответа: summary, recommendedTarget, rationale, suggestedDate, suggestedDueDate, suggestedPriority.",
    "recommendedTarget должен быть только одним из: task, event, note, keep.",
    "summary: короткая фраза в 1 предложении.",
    "rationale: массив максимум из 2 коротких пунктов.",
    "suggestedDate и suggestedDueDate возвращай только в формате YYYY-MM-DD, если дата действительно уместна.",
    "Если дата неочевидна, не возвращай поле.",
    "Никаких side effects и никаких инструкций на выполнение действия.",
  ].join(" ");
}

function buildUserPrompt(item: Pick<InboxItem, "content" | "typeHint">, timezone: string, nowIso: string) {
  return JSON.stringify({
    item: {
      content: item.content,
      typeHint: item.typeHint,
    },
    context: {
      timezone,
      nowIso,
    },
  });
}

export async function analyzeInboxItemForUser(
  userId: string,
  inboxItemId: string,
  timezone: string,
): Promise<InboxAiAnalysis | null> {
  const item = await prisma.inboxItem.findFirst({
    where: {
      id: inboxItemId,
      userId,
    },
    select: {
      id: true,
      content: true,
      typeHint: true,
    },
  });

  if (!item) {
    return null;
  }

  const llm = await getOpenRouterRuntimeConfig(userId);
  if (!llm.apiKey) {
    throw new HttpError(412, "Настройте OpenRouter в Settings > API");
  }

  const endpoint = process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1/chat/completions";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${llm.apiKey}`,
        "Content-Type": "application/json",
        ...(process.env.OPENROUTER_HTTP_REFERER
          ? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER }
          : {}),
        ...(process.env.OPENROUTER_APP_TITLE ? { "X-Title": process.env.OPENROUTER_APP_TITLE } : {}),
      },
      body: JSON.stringify({
        model: llm.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt() },
          {
            role: "user",
            content: buildUserPrompt(item, timezone, new Date().toISOString()),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new HttpError(412, "Настройте OpenRouter в Settings > API");
      }
      throw new HttpError(502, `Inbox AI request failed (HTTP ${response.status})`);
    }

    const payload = (await response.json()) as OpenRouterResponse;
    return parseInboxAiResponse(item.id, readResponseContent(payload));
  } catch (error) {
    if (error instanceof HttpError || error instanceof InboxAiAnalysisError) {
      if (error instanceof InboxAiAnalysisError) {
        throw new HttpError(502, "Inbox AI response was invalid");
      }
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new HttpError(504, "Inbox AI request timed out");
    }

    throw new HttpError(502, "Inbox AI is temporarily unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
