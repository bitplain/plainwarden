import type { TerminalCommandResult } from "@/modules/core/types";
import { ALLOWLIST_HELP_LINES } from "@/modules/terminal/shell/allowlist";

export interface SlashCommand {
  trigger: string;
  description: string;
  aliases?: string[];
}

export interface SlashCommandContext {
  isAuthenticated: boolean;
  isSetupRequired: boolean;
}

const SETUP_COMMANDS: SlashCommand[] = [
  { trigger: "/setup", description: "Open setup wizard", aliases: ["setup"] },
];

const GUEST_COMMANDS: SlashCommand[] = [
  { trigger: "/login", description: "Open login page", aliases: ["login"] },
];

const AUTH_COMMANDS: SlashCommand[] = [
  {
    trigger: "/calendar",
    description: "Open calendar page",
    aliases: ["calendar", "календарь"],
  },
  { trigger: "/home", description: "Open home dashboard", aliases: ["home", "главная"] },
  { trigger: "/kanban", description: "Open Kanban boards", aliases: ["kanban", "канбан"] },
  { trigger: "/notes", description: "Open notes", aliases: ["notes", "заметки"] },
  { trigger: "/settings", description: "Open settings", aliases: ["settings"] },
  { trigger: "/help", description: "Show command help", aliases: ["help"] },
  { trigger: "/clear", description: "Clear terminal history", aliases: ["clear"] },
  {
    trigger: "/end cli",
    description: "Return terminal to centered state",
    aliases: ["end cli", "endcli"],
  },
  { trigger: "/exit", description: "Logout and switch to guest console", aliases: ["exit"] },
];

function normalizeCommandInput(rawInput: string): string {
  const normalizedWhitespace = rawInput.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalizedWhitespace) return "";

  const withoutPrefix = normalizedWhitespace.startsWith("/")
    ? normalizedWhitespace.slice(1).trim()
    : normalizedWhitespace;

  if (!withoutPrefix) return "";
  return `/${withoutPrefix}`;
}

function buildAllowedCommandMap(commands: SlashCommand[]): Map<string, SlashCommand> {
  const allowed = new Map<string, SlashCommand>();

  for (const command of commands) {
    const aliases = [command.trigger, ...(command.aliases ?? [])];
    for (const alias of aliases) {
      const normalized = normalizeCommandInput(alias);
      if (normalized) {
        allowed.set(normalized, command);
      }
    }
  }

  return allowed;
}

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
  const normalized = normalizeCommandInput(rawInput);
  if (!normalized) {
    return { output: [] };
  }

  const availableCommands = getSlashCommands(context);
  const allowed = buildAllowedCommandMap(availableCommands);
  const matchedCommand = allowed.get(normalized);

  if (!matchedCommand) {
    const available = availableCommands.map((command) => command.trigger).join(", ");
    return {
      output: [
        `Unknown slash command: ${rawInput.trim()}`,
        available ? `Available: ${available}` : "No commands available.",
      ],
    };
  }

  if (matchedCommand.trigger === "/clear") {
    return { output: [], action: "clear" };
  }

  if (matchedCommand.trigger === "/help") {
    return help(context);
  }

  if (matchedCommand.trigger === "/setup") {
    return {
      output: ["Opening setup wizard..."],
      action: "navigate",
      navigateTo: "/setup",
    };
  }

  if (matchedCommand.trigger === "/calendar") {
    return {
      output: ["Opening calendar..."],
      action: "navigate",
      navigateTo: "/calendar",
    };
  }

  if (matchedCommand.trigger === "/settings") {
    return {
      output: ["Opening settings..."],
      action: "open_settings",
    };
  }

  if (matchedCommand.trigger === "/home") {
    return {
      output: ["Opening home..."],
      action: "open_home",
    };
  }

  if (matchedCommand.trigger === "/notes") {
    return {
      output: ["Opening notes..."],
      action: "open_notes",
    };
  }

  if (matchedCommand.trigger === "/kanban") {
    return {
      output: ["Opening kanban..."],
      action: "navigate",
      navigateTo: "/kanban",
    };
  }

  if (matchedCommand.trigger === "/login") {
    return {
      output: [],
      action: "login",
      silent: true,
    };
  }

  if (matchedCommand.trigger === "/end cli") {
    return {
      output: ["Returning console to center..."],
      action: "undock",
    };
  }

  if (matchedCommand.trigger === "/exit") {
    return {
      output: [],
      action: "logout",
      navigateTo: "/",
      silent: true,
    };
  }

  return {
    output: [`Unknown slash command: ${rawInput.trim()}`],
  };
}
