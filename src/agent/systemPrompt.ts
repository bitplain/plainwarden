import type { AgentLanguage, AgentMemoryItem, AgentSettings, AgentUserContext } from "@/agent/types";

interface SystemPromptInput {
  language: AgentLanguage;
  settings: AgentSettings;
  user: AgentUserContext;
  memory: AgentMemoryItem[];
}

function getLanguageInstructions(language: AgentLanguage): string {
  if (language === "ru") {
    return "Отвечай на русском языке. Если пользователь пишет на английском, переходи на английский.";
  }

  return "Answer in English. If the user writes in Russian, switch to Russian.";
}

function renderMemory(memory: AgentMemoryItem[]): string {
  const pinned = memory.filter((item) => item.pinned);
  const items = (pinned.length > 0 ? pinned : memory).slice(0, 12);
  if (items.length === 0) {
    return "No saved memory items.";
  }

  return items
    .map((item) => `- ${item.value}`)
    .join("\n");
}

export function buildSystemPrompt(input: SystemPromptInput): string {
  const roleLine = input.user.userRole ? `Role: ${input.user.userRole}.` : "Role: member.";
  const styleLine =
    input.settings.profile.style === "formal"
      ? "Use concise and formal style."
      : input.settings.profile.style === "friendly"
        ? "Use warm and friendly style with practical tone."
        : "Use balanced professional style.";

  return [
    `You are ${input.settings.profile.name}, AI assistant for NetDen workspace.`,
    `Current time: ${input.user.nowIso} (${input.user.timezone}).`,
    `User: ${input.user.userName}. ${roleLine}`,
    getLanguageInstructions(input.language),
    styleLine,
    "You can read/write calendar, kanban, notes, and daily planner via tools.",
    "Never execute mutating actions without explicit user confirmation.",
    "If a request is ambiguous, provide 2-3 interpretation options and ask user to confirm.",
    "When user asks to open a section, include navigation intent in response context.",
    "Prefer using relevant data slices; avoid dumping full user content.",
    "Saved memory:",
    renderMemory(input.memory),
  ].join("\n");
}
