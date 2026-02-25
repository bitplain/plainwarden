"use client";

import { CSSProperties, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TerminalMode } from "@/modules/core/types";
import {
  executeSlashCommand,
  getSlashCommands,
  type SlashCommandContext,
} from "@/modules/terminal/commands";

interface HistoryEntry {
  command: string;
  output: string[];
  mode: TerminalMode;
  failed?: boolean;
}

interface SetupStateResponse {
  setupRequired?: boolean;
}

const CLI_SCALE_KEY = "netden:cli-scale";
const CLI_SCALE_MIN = 0.8;
const CLI_SCALE_MAX = 1.2;
const CLI_SCALE_DEFAULT = 1;

function nextMode(current: TerminalMode): TerminalMode {
  return current === "slash" ? "shell" : "slash";
}

function clampCliScale(value: number): number {
  if (!Number.isFinite(value)) return CLI_SCALE_DEFAULT;
  return Math.min(CLI_SCALE_MAX, Math.max(CLI_SCALE_MIN, value));
}

function readCliScaleFromStorage(): number {
  if (typeof window === "undefined") return CLI_SCALE_DEFAULT;
  const raw = window.localStorage.getItem(CLI_SCALE_KEY);
  if (!raw) return CLI_SCALE_DEFAULT;
  return clampCliScale(Number(raw));
}

function formatShellOutput(input: {
  stdout?: string;
  stderr?: string;
  durationMs?: number;
  ok?: boolean;
}): { lines: string[]; failed: boolean } {
  const lines: string[] = [];
  const stdout = input.stdout?.trim();
  const stderr = input.stderr?.trim();

  if (stdout) {
    lines.push(...stdout.split("\n"));
  }

  if (stderr) {
    lines.push(...stderr.split("\n"));
  }

  if (typeof input.durationMs === "number") {
    lines.push(`[${input.durationMs}ms]`);
  }

  if (lines.length === 0) {
    lines.push(input.ok ? "Command completed with no output." : "Command failed with no output.");
  }

  return {
    lines,
    failed: input.ok !== true,
  };
}

export default function Terminal() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [mode, setMode] = useState<TerminalMode>("slash");
  const [isRunning, setIsRunning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSetupRequired, setIsSetupRequired] = useState(false);
  const [isRuntimeLoading, setIsRuntimeLoading] = useState(true);
  const [cliScale, setCliScale] = useState(CLI_SCALE_DEFAULT);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commandContext = useMemo<SlashCommandContext>(
    () => ({
      isAuthenticated,
      isSetupRequired,
    }),
    [isAuthenticated, isSetupRequired],
  );

  const slashCommands = useMemo(() => getSlashCommands(commandContext), [commandContext]);
  const slashMenuVisible = mode === "slash" && input.trim().startsWith("/");
  const slashQuery = input.trim().slice(1).toLowerCase();

  const filteredSlashCommands = useMemo(() => {
    if (!slashMenuVisible) return [];
    if (!slashQuery) return slashCommands;

    return slashCommands.filter((slashCommand) =>
      slashCommand.trigger.slice(1).toLowerCase().includes(slashQuery),
    );
  }, [slashCommands, slashMenuVisible, slashQuery]);

  useEffect(() => {
    setSelectedSlashIndex(0);
  }, [slashQuery, slashMenuVisible, mode]);

  useEffect(() => {
    if (!hasStarted) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, hasStarted]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setCliScale(readCliScaleFromStorage());
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(media.matches);
    apply();

    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    let active = true;

    const refreshRuntimeState = async () => {
      setIsRuntimeLoading(true);

      try {
        const [setupResponse, meResponse] = await Promise.all([
          fetch("/api/setup/state", { cache: "no-store" }),
          fetch("/api/auth/me", { cache: "no-store" }),
        ]);

        const setupData: SetupStateResponse | null = await setupResponse
          .json()
          .catch(() => null);

        if (!active) {
          return;
        }

        setIsSetupRequired(setupData?.setupRequired === true);
        setIsAuthenticated(meResponse.ok);
      } catch {
        if (!active) {
          return;
        }

        setIsAuthenticated(false);
      } finally {
        if (active) {
          setIsRuntimeLoading(false);
        }
      }
    };

    void refreshRuntimeState();

    const onFocus = () => {
      void refreshRuntimeState();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  async function runShell(line: string) {
    if (!isAuthenticated) {
      setHistory((prev) => [
        ...prev,
        {
          command: line,
          output: ["Unauthorized. Login first with /login."],
          mode: "shell",
          failed: true,
        },
      ]);
      return;
    }

    setIsRunning(true);

    try {
      const response = await fetch("/api/terminal/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-netden-terminal": "1",
        },
        body: JSON.stringify({ line }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            result?: {
              ok?: boolean;
              stdout?: string;
              stderr?: string;
              durationMs?: number;
            };
            message?: string;
          }
        | null;

      if (!response.ok) {
        const message = data?.message || `Shell request failed (HTTP ${response.status})`;
        setHistory((prev) => [
          ...prev,
          {
            command: line,
            output: [message],
            mode: "shell",
            failed: true,
          },
        ]);
        return;
      }

      const formatted = formatShellOutput(data?.result ?? {});
      setHistory((prev) => [
        ...prev,
        {
          command: line,
          output: formatted.lines,
          mode: "shell",
          failed: formatted.failed,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Shell request failed";
      setHistory((prev) => [
        ...prev,
        {
          command: line,
          output: [message],
          mode: "shell",
          failed: true,
        },
      ]);
    } finally {
      setIsRunning(false);
      setInput("");
      setHistoryIndex(-1);
    }
  }

  async function runInput(rawInput: string) {
    const trimmed = rawInput.trim();
    if (!trimmed || isRunning) return;

    setCmdHistory((prev) => [trimmed, ...prev]);

    if (mode === "shell") {
      await runShell(trimmed);
      return;
    }

    const result = executeSlashCommand(trimmed, commandContext);

    if (result.action === "clear") {
      setHistory([]);
      setInput("");
      setHistoryIndex(-1);
      return;
    }

    setHistory((prev) => [
      ...prev,
      {
        command: trimmed,
        output: result.output,
        mode: "slash",
      },
    ]);

    setInput("");
    setHistoryIndex(-1);

    if (result.action === "logout") {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "content-type": "application/json" },
        });
      } catch {
        // Session already invalidated in this case.
      }

      setIsAuthenticated(false);
      setMode("slash");
      setHasStarted(false);
      router.push("/");
      return;
    }

    if (result.action === "navigate" && result.navigateTo) {
      const navigateTo = result.navigateTo;
      setTimeout(() => router.push(navigateTo), 180);
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Tab" && !isMobile) {
      event.preventDefault();
      setMode((current) => nextMode(current));
      return;
    }

    if (slashMenuVisible && filteredSlashCommands.length > 0) {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedSlashIndex((prev) =>
          prev <= 0 ? filteredSlashCommands.length - 1 : prev - 1,
        );
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedSlashIndex((prev) =>
          prev >= filteredSlashCommands.length - 1 ? 0 : prev + 1,
        );
        return;
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) return;

      let commandToRun = trimmed;
      if (slashMenuVisible && filteredSlashCommands.length > 0) {
        const exactMatch = filteredSlashCommands.find(
          (slashCommand) => slashCommand.trigger.toLowerCase() === trimmed.toLowerCase(),
        );

        if (!exactMatch) {
          commandToRun = filteredSlashCommands[selectedSlashIndex].trigger;
        }
      }

      if (!hasStarted && commandToRun.trim().length > 0) {
        setHasStarted(true);
      }

      void runInput(commandToRun);
      return;
    }

    if (event.key === "ArrowUp" && !slashMenuVisible) {
      event.preventDefault();
      if (cmdHistory.length > 0 && historyIndex < cmdHistory.length - 1) {
        const next = historyIndex + 1;
        setHistoryIndex(next);
        setInput(cmdHistory[next]);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex > 0) {
        const next = historyIndex - 1;
        setHistoryIndex(next);
        setInput(cmdHistory[next]);
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  const rootStyle = useMemo(
    () =>
      ({
        "--nd-cli-scale": String(cliScale),
      }) as CSSProperties,
    [cliScale],
  );

  const idleCommandHint = isSetupRequired ? "/setup" : isAuthenticated ? "/help" : "/login";

  return (
    <div
      className={`terminal-page terminal-page-${mode} ${hasStarted ? "terminal-started" : "terminal-idle"}`}
      style={rootStyle}
    >
      <div className="terminal-grid-overlay" aria-hidden />

      <header className={`terminal-brand ${hasStarted ? "terminal-brand-active" : ""}`}>
        <h1 className="terminal-brand-name">NetDen</h1>
      </header>

      <div
        className={`terminal-history-shell ${hasStarted ? "terminal-history-shell-visible" : ""}`}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="terminal-stream">
          {history.map((entry, index) => (
            <div
              key={`${entry.command}-${index}`}
              className={`terminal-entry terminal-entry-${entry.mode} nd-animate-in`}
            >
              <div className="terminal-command-row">
                <span className="terminal-command-caret">{entry.mode === "shell" ? "$" : "/"}</span>
                <span className="terminal-command-text">{entry.command}</span>
              </div>
              {entry.output.length > 0 && (
                <div className={`terminal-output ${entry.failed ? "terminal-output-failed" : ""}`}>
                  {entry.output.map((line, lineIndex) => (
                    <div key={lineIndex} className="terminal-output-line">
                      {line || "\u00A0"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {hasStarted && history.length === 0 && (
            <div className="terminal-entry nd-animate-in">
              <div className="terminal-output">
                {isRuntimeLoading ? (
                  <div className="terminal-output-line">Checking runtime state...</div>
                ) : (
                  <>
                    <div className="terminal-output-line">System ready.</div>
                    <div className="terminal-output-line">Use {idleCommandHint} to continue.</div>
                  </>
                )}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <footer className={`terminal-composer ${hasStarted ? "terminal-composer-active" : ""}`}>
        <div className={`terminal-input-shell terminal-input-shell-${mode}`}>
          <span className="terminal-input-caret">{mode === "shell" ? "$" : "/"}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (!hasStarted && nextValue.trim().length > 0) {
                setHasStarted(true);
              }
              setInput(nextValue);
              setSelectedSlashIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="terminal-input"
            placeholder={
              mode === "shell"
                ? "Run allowlisted server command..."
                : `Type command, e.g. ${idleCommandHint}`
            }
            autoFocus
            spellCheck={false}
            aria-label="Terminal input"
          />
        </div>

        <div className="terminal-mode-row">
          <span className={`terminal-mode-label terminal-mode-label-${mode}`}>
            {mode === "slash" ? "Slash mode" : "Shell mode"}
          </span>
          <span className="terminal-mode-meta">
            {isMobile ? "Use Slash | Shell switcher" : "Press Tab to switch mode"}
          </span>
        </div>

        {isMobile && (
          <div className="terminal-mode-toggle" role="tablist" aria-label="Input mode switcher">
            <button
              type="button"
              className={`terminal-mode-button ${mode === "slash" ? "is-active" : ""}`}
              onClick={() => setMode("slash")}
              aria-selected={mode === "slash"}
              role="tab"
            >
              Slash
            </button>
            <button
              type="button"
              className={`terminal-mode-button ${mode === "shell" ? "is-active" : ""}`}
              onClick={() => setMode("shell")}
              aria-selected={mode === "shell"}
              role="tab"
            >
              Shell
            </button>
          </div>
        )}

        {slashMenuVisible && (
          <div className="terminal-slash-menu">
            {filteredSlashCommands.length > 0 ? (
              filteredSlashCommands.map((slashCommand, index) => (
                <button
                  key={slashCommand.trigger}
                  type="button"
                  className={`terminal-slash-item ${index === selectedSlashIndex ? "terminal-slash-item-active" : ""}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setSelectedSlashIndex(index)}
                  onClick={() => void runInput(slashCommand.trigger)}
                >
                  <span className="terminal-slash-item-trigger">{slashCommand.trigger}</span>
                  <span className="terminal-slash-item-description">{slashCommand.description}</span>
                </button>
              ))
            ) : (
              <div className="terminal-slash-empty">No commands found.</div>
            )}
          </div>
        )}

        {!hasStarted && (
          <>
            <div className="terminal-idle-meta">
              <span>
                <strong>{isMobile ? "tap" : "tab"}</strong> switch mode
              </span>
              <span>
                <strong>{isMobile ? "tap" : "type"}</strong> {idleCommandHint} to continue
              </span>
            </div>
            <div className="terminal-idle-tip">
              <span className="terminal-idle-tip-dot">●</span>
              <span>
                {isRuntimeLoading
                  ? "Checking session..."
                  : isAuthenticated
                    ? "Session active. /exit logs out to guest console."
                    : "Guest console mode. Login required for calendar and shell."}
              </span>
            </div>
          </>
        )}
      </footer>
    </div>
  );
}
