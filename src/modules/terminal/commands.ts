import type { TerminalCommandResult } from "@/modules/core/types";
import { ALLOWLIST_HELP_LINES } from "@/modules/terminal/shell/allowlist";

export interface SlashCommand {
  trigger: string;
  description: string;
}

export interface SlashCommandContext {
  isAuthenticated: boolean;
  isSetupRequired: boolean;
}

const SETUP_COMMANDS: SlashCommand[] = [
  { trigger: "/setup", description: "Open setup wizard" },
];

const GUEST_COMMANDS: SlashCommand[] = [
  { trigger: "/login", description: "Open login page" },
];

const AUTH_COMMANDS: SlashCommand[] = [
  { trigger: "/calendar", description: "Open calendar" },
  { trigger: "/settings", description: "Open settings" },
  { trigger: "/help", description: "Show command help" },
  { trigger: "/clear", description: "Clear terminal history" },
  { trigger: "/exit", description: "Logout and switch to guest console" },
];

function help(context: SlashCommandContext): TerminalCommandResult {
  const commands = getSlashCommands(context);
  const commandLines = commands.map((command) => `  ${command.trigger.padEnd(10, " ")}- ${command.description}`);

  if (!context.isAuthenticated) {
    return {
      output: ["Available command:", ...commandLines],
    };
  }

  return {
    output: [
      "NetDen commands:",
      ...commandLines,
      "",
      ...ALLOWLIST_HELP_LINES,
    ],
  };
}

export function getSlashCommands(context: SlashCommandContext): SlashCommand[] {
  if (context.isSetupRequired) {
    return SETUP_COMMANDS;
  }

  if (!context.isAuthenticated) {
    return GUEST_COMMANDS;
  }

  return AUTH_COMMANDS;
}

export function executeSlashCommand(
  rawInput: string,
  context: SlashCommandContext,
): TerminalCommandResult {
  const normalized = rawInput.trim().toLowerCase();
  if (!normalized) {
    return { output: [] };
  }

  const allowed = new Set(getSlashCommands(context).map((command) => command.trigger));

  if (!allowed.has(normalized)) {
    const available = [...allowed].join(", ");
    return {
      output: [
        `Unknown slash command: ${rawInput.trim()}`,
        available ? `Available: ${available}` : "No commands available.",
      ],
    };
  }

  if (normalized === "/clear") {
    return { output: [], action: "clear" };
  }

  if (normalized === "/help") {
    return help(context);
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

  if (normalized === "/settings") {
    return {
      output: ["Opening settings..."],
      action: "navigate",
      navigateTo: "/settings",
    };
  }

  if (normalized === "/login") {
    return {
      output: ["Opening login..."],
      action: "navigate",
      navigateTo: "/login",
    };
  }

  if (normalized === "/exit") {
    return {
      output: ["Closing session..."],
      action: "logout",
      navigateTo: "/",
    };
  }

  return {
    output: [`Unknown slash command: ${rawInput.trim()}`],
  };
}
