"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TerminalMode } from "@/modules/core/types";
import { executeSlashCommand, getSlashCommands } from "@/modules/terminal/commands";

interface HistoryEntry {
  command: string;
  output: string[];
  mode: TerminalMode;
  failed?: boolean;
}

function nextMode(current: TerminalMode): TerminalMode {
  return current === "slash" ? "shell" : "slash";
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

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const slashCommands = useMemo(() => getSlashCommands(), []);
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
    const media = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(media.matches);
    apply();

    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  async function runShell(line: string) {
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

    const result = executeSlashCommand(trimmed);
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

    if (result.action === "navigate" && result.navigateTo) {
      setTimeout(() => router.push(result.navigateTo!), 220);
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

  return (
    <div className={`terminal-page terminal-page-${mode} ${hasStarted ? "terminal-started" : "terminal-idle"}`}>
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
                  {entry.output.map((line, j) => (
                    <div key={j} className="terminal-output-line">
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
                <div className="terminal-output-line">System ready.</div>
                <div className="terminal-output-line">Use /help for slash commands.</div>
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
            onChange={(e) => {
              const nextValue = e.target.value;
              if (!hasStarted && nextValue.trim().length > 0) {
                setHasStarted(true);
              }
              setInput(nextValue);
              setSelectedSlashIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="terminal-input"
            placeholder={mode === "shell" ? "Run allowlisted server command..." : "Type slash command, e.g. /setup"}
            autoFocus
            spellCheck={false}
            aria-label="Terminal input"
          />
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
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setSelectedSlashIndex(index)}
                  onClick={() => void runInput(slashCommand.trigger)}
                >
                  <span className="terminal-slash-item-trigger">{slashCommand.trigger}</span>
                  <span className="terminal-slash-item-description">{slashCommand.description}</span>
                </button>
              ))
            ) : (
              <div className="terminal-slash-empty">No slash commands found.</div>
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
                <strong>{isMobile ? "tap" : "type"}</strong> /setup to initialize
              </span>
            </div>
            <div className="terminal-idle-tip">
              <span className="terminal-idle-tip-dot">●</span>
              <span>{isMobile ? "Mobile mode active: use Slash | Shell switcher." : "Desktop mode active: Tab toggles Slash/Shell."}</span>
            </div>
          </>
        )}

        {hasStarted && (
          <div className="terminal-status-bar">
            <span>~/netden</span>
            <span className={`terminal-status-center terminal-status-center-${mode}`}>{mode} mode</span>
            <span>{isRunning ? "running..." : "ready"}</span>
          </div>
        )}
      </footer>
    </div>
  );
}
