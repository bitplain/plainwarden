import { addDays, format } from "date-fns";
import { classifyUserIntent, selectRelevantModules } from "@/agent/intent";
import { buildSystemPrompt } from "@/agent/systemPrompt";
import { createPendingAction, getPendingAction, removePendingAction } from "@/agent/pendingActions";
import type {
  AgentActionProposal,
  AgentLanguage,
  AgentMessage,
  AgentModule,
  AgentTurnInput,
  AgentTurnResult,
  AgentUserContext,
  DailyItem,
} from "@/agent/types";
import { detectLanguageCode } from "@/hooks/useLanguageDetect";
import type { CalendarEvent, KanbanCard, Note } from "@/lib/types";
import prisma from "@/lib/server/prisma";
import { executeTool, executeToolsParallel, getOpenRouterTools, isMutatingTool } from "@/tools";
import { buildUnifiedContext } from "@/utils/contextBuilder";
import { logger } from "@/utils/logger";

interface AgentCoreConfig {
  user: AgentUserContext;
  llm?: {
    openrouterApiKey?: string | null;
    openrouterModel?: string | null;
  };
}

interface OpenRouterChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: OpenRouterChatMessage;
  }>;
}

function normalizeChatHistory(history: AgentMessage[]): OpenRouterChatMessage[] {
  return history.slice(-8).map((message) => ({
    role: message.role,
    content: message.content,
    name: message.name,
    tool_call_id: message.toolCallId,
  }));
}

function parseToolArguments(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function buildProposalSummary(toolName: string, args: Record<string, unknown>, language: AgentLanguage): string {
  const argText = JSON.stringify(args);
  if (language === "ru") {
    return `Подтвердите действие ${toolName} с параметрами ${argText}`;
  }
  return `Please confirm action ${toolName} with args ${argText}`;
}

function fallbackText(language: AgentLanguage, prompt: string): string {
  if (language === "ru") {
    return `Не удалось обратиться к LLM. Вот кратко по запросу: ${prompt}`;
  }
  return `LLM is temporarily unavailable. Quick summary for your request: ${prompt}`;
}

async function syncEntitiesAfterCalendarChange(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, date: true },
  });

  if (!event) {
    return { syncedCards: 0, syncedNotes: 0 };
  }

  const cards = await prisma.kanbanCardEventLink.findMany({
    where: { eventId },
    select: { cardId: true },
  });

  let syncedCards = 0;
  for (const cardLink of cards) {
    await prisma.kanbanCard.update({
      where: { id: cardLink.cardId },
      data: {
        title: event.title,
        dueDate: event.date,
      },
    });
    syncedCards += 1;
  }

  const notes = await prisma.noteEventLink.findMany({
    where: { eventId },
    select: { noteId: true },
  });

  let syncedNotes = 0;
  for (const noteLink of notes) {
    await prisma.note.update({
      where: { id: noteLink.noteId },
      data: {
        title: event.title,
      },
    });
    syncedNotes += 1;
  }

  return {
    syncedCards,
    syncedNotes,
  };
}

export class AgentCore {
  private readonly user: AgentUserContext;
  private readonly model: string;
  private readonly apiKey: string | null;

  constructor(config: AgentCoreConfig) {
    this.user = config.user;
    this.model =
      config.llm?.openrouterModel?.trim() ||
      process.env.OPENROUTER_MODEL?.trim() ||
      "openai/gpt-4o-mini";
    this.apiKey = config.llm?.openrouterApiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim() || null;
  }

  private async callOpenRouter(payload: Record<string, unknown>): Promise<OpenRouterResponse | null> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      return null;
    }

    const endpoint = process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1/chat/completions";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(process.env.OPENROUTER_HTTP_REFERER
            ? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER }
            : {}),
          ...(process.env.OPENROUTER_APP_TITLE ? { "X-Title": process.env.OPENROUTER_APP_TITLE } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        logger.warn("openrouter_http_error", { status: response.status, body });
        return null;
      }

      return (await response.json()) as OpenRouterResponse;
    } catch (error) {
      logger.error("openrouter_request_failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async buildContextSnapshot(message: string, modules: AgentModule[]) {
    const now = new Date(this.user.nowIso);
    const dateFrom = format(now, "yyyy-MM-dd");
    const dateTo = format(addDays(now, 14), "yyyy-MM-dd");

    const [calendar, kanban, notes, daily] = await Promise.all([
      modules.includes("calendar")
        ? executeTool("calendar_list_events", { dateFrom, dateTo, limit: 50 }, {
            userId: this.user.userId,
            nowIso: this.user.nowIso,
          })
        : Promise.resolve({ ok: true, data: [] }),
      modules.includes("kanban")
        ? executeTool("kanban_list_cards", {}, { userId: this.user.userId, nowIso: this.user.nowIso })
        : Promise.resolve({ ok: true, data: [] }),
      modules.includes("notes")
        ? executeTool(
            "notes_search",
            { q: message.length > 4 ? message.slice(0, 80) : undefined },
            { userId: this.user.userId, nowIso: this.user.nowIso },
          )
        : Promise.resolve({ ok: true, data: [] }),
      modules.includes("daily")
        ? executeTool("daily_overview", { startDate: dateFrom, days: 14 }, {
            userId: this.user.userId,
            nowIso: this.user.nowIso,
          })
        : Promise.resolve({ ok: true, data: { items: [] } }),
    ]);

    const events = Array.isArray(calendar.data) ? (calendar.data as CalendarEvent[]) : [];
    const cards = Array.isArray(kanban.data) ? (kanban.data as KanbanCard[]) : [];
    const noteItems = Array.isArray(notes.data) ? (notes.data as Note[]) : [];
    const dailyItems =
      daily.data && typeof daily.data === "object" && Array.isArray((daily.data as { items?: unknown[] }).items)
        ? ((daily.data as { items: DailyItem[] }).items ?? [])
        : [];

    return buildUnifiedContext(
      {
        events,
        cards,
        notes: noteItems,
        daily: dailyItems,
      },
      { maxChars: 2400 },
    );
  }

  private async executeApprovedAction(
    action: AgentActionProposal,
    language: AgentLanguage,
  ): Promise<{ text: string; usedModules: AgentModule[] }> {
    const result = await executeTool(action.toolName, action.arguments, {
      userId: this.user.userId,
      nowIso: this.user.nowIso,
    });

    let syncReport = "";
    if (result.ok && action.toolName.startsWith("calendar_")) {
      const eventId =
        typeof (result.data as { id?: unknown })?.id === "string"
          ? ((result.data as { id: string }).id)
          : typeof action.arguments.eventId === "string"
            ? action.arguments.eventId
            : undefined;

      if (eventId) {
        const syncResult = await syncEntitiesAfterCalendarChange(eventId);
        syncReport =
          language === "ru"
            ? ` Синхронизировано: карточек ${syncResult.syncedCards}, заметок ${syncResult.syncedNotes}.`
            : ` Synced: cards ${syncResult.syncedCards}, notes ${syncResult.syncedNotes}.`;
      }
    }

    if (!result.ok) {
      return {
        text:
          language === "ru"
            ? `Не удалось выполнить действие: ${result.error ?? "unknown"}`
            : `Could not execute action: ${result.error ?? "unknown"}`,
        usedModules: ["calendar", "kanban", "notes", "daily"],
      };
    }

    return {
      text:
        language === "ru"
          ? `Готово. Действие выполнено успешно.${syncReport}`
          : `Done. Action completed successfully.${syncReport}`,
      usedModules: ["calendar", "kanban", "notes", "daily"],
    };
  }

  async runTurn(input: AgentTurnInput): Promise<AgentTurnResult> {
    const language = detectLanguageCode(input.message ?? input.history.at(-1)?.content ?? "");

    if (input.actionDecision) {
      const pending = getPendingAction(input.actionDecision.actionId, this.user.userId);
      if (!pending) {
        return {
          text:
            language === "ru"
              ? "Запрошенное действие не найдено или уже истекло."
              : "Requested action was not found or has expired.",
          language,
          intent: {
            type: "clarify",
            confidence: 0.6,
            requiresConfirmation: false,
          },
          usedModules: [],
        };
      }

      removePendingAction(pending.id);

      if (!input.actionDecision.approved) {
        return {
          text:
            language === "ru"
              ? "Понял, действие отменено."
              : "Understood, action was canceled.",
          language,
          intent: {
            type: "action",
            actionKind: "delete",
            confidence: 0.9,
            requiresConfirmation: false,
          },
          usedModules: [],
        };
      }

      const executionResult = await this.executeApprovedAction(pending, language);
      return {
        text: executionResult.text,
        language,
        intent: {
          type: "action",
          actionKind: "update",
          confidence: 0.9,
          requiresConfirmation: false,
        },
        usedModules: executionResult.usedModules,
      };
    }

    const message = input.message?.trim() ?? "";
    const intent = classifyUserIntent(message);

    if (intent.type === "navigate" && intent.navigateTo) {
      return {
        text:
          language === "ru"
            ? `Открываю раздел ${intent.navigateTo}.`
            : `Opening section ${intent.navigateTo}.`,
        language,
        intent,
        navigateTo: intent.navigateTo,
        usedModules: [],
      };
    }

    const modules = selectRelevantModules(message);
    const context = await this.buildContextSnapshot(message, modules);
    const systemPrompt = buildSystemPrompt({
      language,
      settings: input.settings,
      user: this.user,
      memory: input.memory,
    });

    const messages: OpenRouterChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...normalizeChatHistory(input.history),
      {
        role: "user",
        content: [
          message,
          "",
          "Relevant workspace context:",
          context.promptFragment,
          "",
          "Use tools when needed. For mutating actions propose one action and wait for confirmation.",
        ].join("\n"),
      },
    ];

    const tools = getOpenRouterTools(modules);

    for (let step = 0; step < 4; step += 1) {
      const response = await this.callOpenRouter({
        model: this.model,
        messages,
        tools,
        tool_choice: "auto",
        parallel_tool_calls: true,
        temperature: 0.2,
      });

      const assistant = response?.choices?.[0]?.message;
      if (!assistant) {
        return {
          text: fallbackText(language, message),
          language,
          intent,
          usedModules: modules,
        };
      }

      const toolCalls = assistant.tool_calls ?? [];
      if (toolCalls.length === 0) {
        const content = assistant.content?.trim();
        if (!content) {
          return {
            text: fallbackText(language, message),
            language,
            intent,
            usedModules: modules,
          };
        }

        return {
          text: content,
          language,
          intent,
          usedModules: modules,
        };
      }

      messages.push({
        role: "assistant",
        content: assistant.content,
        tool_calls: toolCalls,
      });

      const parsedCalls = toolCalls.map((toolCall) => ({
        toolName: toolCall.function.name,
        toolCallId: toolCall.id,
        args: parseToolArguments(toolCall.function.arguments),
      }));

      const mutatingCall = parsedCalls.find((call) => isMutatingTool(call.toolName));
      if (mutatingCall) {
        const proposal = createPendingAction({
          userId: this.user.userId,
          toolName: mutatingCall.toolName,
          arguments: mutatingCall.args,
          summary: buildProposalSummary(mutatingCall.toolName, mutatingCall.args, language),
        });

        return {
          text:
            language === "ru"
              ? `Предлагаю действие: ${proposal.summary}`
              : `I suggest this action: ${proposal.summary}`,
          language,
          intent,
          pendingAction: proposal,
          usedModules: modules,
        };
      }

      const results = await executeToolsParallel(
        parsedCalls.map((call) => ({
          toolName: call.toolName,
          args: call.args,
          toolCallId: call.toolCallId,
        })),
        {
          userId: this.user.userId,
          nowIso: this.user.nowIso,
        },
      );

      for (const result of results) {
        messages.push({
          role: "tool",
          tool_call_id: result.toolCallId,
          content: JSON.stringify(result.result),
        });
      }
    }

    return {
      text:
        language === "ru"
          ? "Запрос слишком сложный для одного прохода. Уточните, что важно в первую очередь."
          : "This request is too broad for one pass. Please clarify what to prioritize.",
      language,
      intent,
      usedModules: modules,
    };
  }
}
