import type { AllowlistedCommandSpec, ParsedCommand } from "@/modules/terminal/shell/types";

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_OUTPUT_BYTES = 128 * 1024;
const DEFAULT_TAIL = 200;
const MAX_TAIL = 500;

function isSafeName(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(value);
}

function parseTail(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 1 || parsed > MAX_TAIL) return null;
  return parsed;
}

function spec(input: Omit<AllowlistedCommandSpec, "timeoutMs" | "maxOutputBytes">): AllowlistedCommandSpec {
  return {
    ...input,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxOutputBytes: DEFAULT_MAX_OUTPUT_BYTES,
  };
}

export function resolveAllowlistedCommand(parsed: ParsedCommand): AllowlistedCommandSpec | null {
  const cmd = parsed.cmd;
  const args = parsed.args;

  if (cmd === "df" && (args.length === 0 || (args.length === 1 && args[0] === "-h"))) {
    return spec({
      id: "df",
      file: "df",
      args: ["-h"],
      description: "Disk usage",
    });
  }

  if (cmd === "uptime" && args.length === 0) {
    return spec({
      id: "uptime",
      file: "uptime",
      args: [],
      description: "Uptime and load",
    });
  }

  if (cmd === "uname" && (args.length === 0 || (args.length === 1 && args[0] === "-a"))) {
    return spec({
      id: "uname",
      file: "uname",
      args: args.length ? ["-a"] : [],
      description: "Kernel and OS info",
    });
  }

  if (cmd === "docker" && args.length === 1 && args[0] === "ps") {
    return spec({
      id: "docker.ps",
      file: "docker",
      args: ["ps"],
      description: "Docker containers",
    });
  }

  if (cmd === "docker" && args.length === 1 && args[0] === "images") {
    return spec({
      id: "docker.images",
      file: "docker",
      args: ["images"],
      description: "Docker images",
    });
  }

  if (cmd === "docker" && args.length === 1 && args[0] === "stats") {
    return spec({
      id: "docker.stats",
      file: "docker",
      args: ["stats", "--no-stream"],
      description: "Docker stats snapshot",
    });
  }

  if (cmd === "docker" && args.length === 2 && args[0] === "stats" && args[1] === "--no-stream") {
    return spec({
      id: "docker.stats",
      file: "docker",
      args: ["stats", "--no-stream"],
      description: "Docker stats snapshot",
    });
  }

  if (cmd === "docker" && args.length === 2 && args[0] === "system" && args[1] === "df") {
    return spec({
      id: "docker.system.df",
      file: "docker",
      args: ["system", "df"],
      description: "Docker disk usage",
    });
  }

  if (cmd === "docker" && args.length === 2 && args[0] === "logs" && isSafeName(args[1] || "")) {
    return spec({
      id: "docker.logs",
      file: "docker",
      args: ["logs", "--tail", String(DEFAULT_TAIL), args[1]],
      description: "Docker container logs",
    });
  }

  if (cmd === "docker" && args.length === 4 && args[0] === "logs" && args[1] === "--tail") {
    const tail = parseTail(args[2] || "");
    const container = args[3] || "";
    if (!tail || !isSafeName(container)) return null;

    return spec({
      id: "docker.logs",
      file: "docker",
      args: ["logs", "--tail", String(tail), container],
      description: "Docker container logs",
    });
  }

  if (cmd === "docker" && args.length === 2 && args[0] === "compose" && args[1] === "ps") {
    return spec({
      id: "docker.compose.ps",
      file: "docker",
      args: ["compose", "ps"],
      description: "Compose services",
    });
  }

  if (cmd === "docker" && args.length === 2 && args[0] === "compose" && args[1] === "ls") {
    return spec({
      id: "docker.compose.ls",
      file: "docker",
      args: ["compose", "ls"],
      description: "Compose projects",
    });
  }

  if (cmd === "docker" && args.length === 3 && args[0] === "compose" && args[1] === "logs" && isSafeName(args[2] || "")) {
    return spec({
      id: "docker.compose.logs",
      file: "docker",
      args: ["compose", "logs", "--tail", String(DEFAULT_TAIL), args[2]],
      description: "Compose service logs",
    });
  }

  if (cmd === "docker" && args.length === 5 && args[0] === "compose" && args[1] === "logs" && args[2] === "--tail") {
    const tail = parseTail(args[3] || "");
    const service = args[4] || "";
    if (!tail || !isSafeName(service)) return null;

    return spec({
      id: "docker.compose.logs",
      file: "docker",
      args: ["compose", "logs", "--tail", String(tail), service],
      description: "Compose service logs",
    });
  }

  return null;
}

export const ALLOWLIST_HELP_LINES = [
  "Read-only shell allowlist:",
  "  df | df -h",
  "  uptime",
  "  uname -a",
  "  docker ps",
  "  docker images",
  "  docker stats [--no-stream]",
  "  docker system df",
  "  docker logs NAME [--tail N]",
  "  docker compose ps",
  "  docker compose ls",
  "  docker compose logs NAME [--tail N]",
];
