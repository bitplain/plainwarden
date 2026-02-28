import type { AgentIntent, AgentModule } from "@/agent/types";

const ACTION_PATTERNS: Record<string, RegExp[]> = {
  create: [/\b(create|add|new)\b/i, /(сделай|создай|добавь)/i],
  update: [/\b(update|edit|rename)\b/i, /(измени|обнови|переименуй)/i],
  delete: [/\b(delete|remove)\b/i, /(удали|убери)/i],
  move: [/\b(move|transfer)\b/i, /(перемести|перенеси)/i],
  generate: [/\b(generate|draft|write)\b/i, /(сгенерируй|напиши)/i],
};

const NAVIGATION_PATTERNS: Array<{ route: string; regex: RegExp[] }> = [
  { route: "/calendar", regex: [/\b(calendar|календар)\b/i] },
  { route: "/kanban", regex: [/\b(kanban|board|доска|канбан)\b/i] },
  { route: "/notes", regex: [/\b(notes?|заметк)\b/i] },
  { route: "/home", regex: [/\b(home|dashboard|главн)\b/i] },
  { route: "/settings", regex: [/\b(settings?|настройк)\b/i] },
];

const MODULE_PATTERNS: Array<{ module: AgentModule; regex: RegExp[] }> = [
  { module: "calendar", regex: [/\b(calendar|event|meeting|календар|событи|расписан|deadline)\b/i] },
  { module: "kanban", regex: [/\b(kanban|board|card|column|канбан|доск|карточк|статус)\b/i] },
  { module: "notes", regex: [/\b(note|notes|wiki|заметк|конспект)\b/i] },
  { module: "daily", regex: [/\b(daily|planner|routine|today|tomorrow|ежеднев|сегодня|завтра)\b/i] },
];

function testAny(regexList: RegExp[], message: string): boolean {
  return regexList.some((regex) => regex.test(message));
}

export function selectRelevantModules(message: string): AgentModule[] {
  const normalized = message.trim();
  if (!normalized) return ["daily"];

  const selected = MODULE_PATTERNS.filter((rule) => testAny(rule.regex, normalized)).map(
    (rule) => rule.module,
  );

  if (selected.length === 0) {
    return ["daily", "calendar", "kanban", "notes"];
  }

  return [...new Set(selected)];
}

export function classifyUserIntent(message: string): AgentIntent {
  const normalized = message.trim();
  if (!normalized) {
    return {
      type: "clarify",
      confidence: 0.2,
      requiresConfirmation: false,
    };
  }

  const nav = NAVIGATION_PATTERNS.find((rule) => testAny(rule.regex, normalized));
  if (nav && /\b(open|show|перейди|открой|покажи)\b/i.test(normalized)) {
    return {
      type: "navigate",
      confidence: 0.85,
      navigateTo: nav.route,
      requiresConfirmation: false,
    };
  }

  for (const [actionKind, patterns] of Object.entries(ACTION_PATTERNS)) {
    if (testAny(patterns, normalized)) {
      return {
        type: "action",
        actionKind: actionKind as AgentIntent["actionKind"],
        confidence: 0.8,
        requiresConfirmation: true,
      };
    }
  }

  if (/\?$/.test(normalized) || /\b(какие|какой|что|when|what|show|list|покажи|найди)\b/i.test(normalized)) {
    return {
      type: "query",
      confidence: 0.72,
      requiresConfirmation: false,
    };
  }

  return {
    type: "unknown",
    confidence: 0.4,
    requiresConfirmation: false,
  };
}
