import type { ParsedCommand } from "@/modules/terminal/shell/types";

export function parseCommandLine(input: string): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    return { cmd: "", args: [] };
  }

  const parts = trimmed.split(/\s+/g);
  const [cmd, ...args] = parts;

  return {
    cmd: (cmd || "").toLowerCase(),
    args,
  };
}
