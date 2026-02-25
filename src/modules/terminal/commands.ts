import type { TerminalCommandResult } from "@/modules/core/types";
import { ALLOWLIST_HELP_LINES } from "@/modules/terminal/shell/allowlist";

export interface SlashCommand {
  trigger: string;
  description: string;
}

const slashCommands: SlashCommand[] = [
  { trigger: "/setup", description: "Open setup wizard" },
  { trigger: "/calendar", description: "Open calendar" },
  { trigger: "/login", description: "Open login" },
  { trigger: "/help", description: "Show command help" },
  { trigger: "/clear", description: "Clear terminal history" },
];

function help(): TerminalCommandResult {
  return {
    output: [
      "NetDen commands:",
      "  /setup      - open setup wizard",
      "  /calendar   - open calendar",
      "  /login      - open login",
      "  /clear      - clear terminal",
      "  /help       - show help",
      "",
      ...ALLOWLIST_HELP_LINES,
    ],
  };
}

export function getSlashCommands(): SlashCommand[] {
  return slashCommands;
}

export function executeSlashCommand(rawInput: string): TerminalCommandResult {
  const normalized = rawInput.trim().toLowerCase();
  if (!normalized) {
    return { output: [] };
  }

  if (normalized === "/clear") {
    return { output: [], action: "clear" };
  }

  if (normalized === "/help") {
    return help();
  }

  if (normalized === "/setup") {
    return {
      output: ["Opening setup wizard..."],
      action: "navigate",
      navigateTo: "/setup",
    };
  }

  if (normalized === "/calendar") {
    return {
      output: ["Opening calendar..."],
      action: "navigate",
      navigateTo: "/calendar",
    };
  }

  if (normalized === "/login") {
    return {
      output: ["Opening login..."],
      action: "navigate",
      navigateTo: "/login",
    };
  }

  return {
    output: [`Unknown slash command: ${rawInput.trim()}`, "Use /help to list available commands."],
  };
}
