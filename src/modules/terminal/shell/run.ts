import "server-only";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AllowlistedCommandSpec, RunCommandResult } from "@/modules/terminal/shell/types";

const execFileAsync = promisify(execFile);

function truncateToBytes(value: string, maxBytes: number): string {
  const buf = Buffer.from(value, "utf8");
  if (buf.byteLength <= maxBytes) return value;
  return buf.subarray(0, maxBytes).toString("utf8") + "\n[output truncated]";
}

export async function runAllowlistedCommand(spec: AllowlistedCommandSpec): Promise<RunCommandResult> {
  const started = Date.now();

  try {
    const { stdout, stderr } = await execFileAsync(spec.file, spec.args, {
      timeout: spec.timeoutMs,
      maxBuffer: spec.maxOutputBytes,
      windowsHide: true,
      shell: false,
    });

    return {
      ok: true,
      id: spec.id,
      file: spec.file,
      args: spec.args,
      exitCode: 0,
      stdout: truncateToBytes(stdout ?? "", spec.maxOutputBytes),
      stderr: truncateToBytes(stderr ?? "", spec.maxOutputBytes),
      durationMs: Date.now() - started,
    };
  } catch (error: unknown) {
    const err = error as {
      code?: unknown;
      stdout?: unknown;
      stderr?: unknown;
      message?: unknown;
    };

    const stdout = typeof err.stdout === "string" ? err.stdout : "";
    const stderr = typeof err.stderr === "string" ? err.stderr : "";
    const exitCode = typeof err.code === "number" ? err.code : 1;
    const message =
      err.code === "ENOENT"
        ? `Command not found: ${spec.file}`
        : typeof err.message === "string"
          ? err.message
          : "Command execution failed";

    return {
      ok: false,
      id: spec.id,
      file: spec.file,
      args: spec.args,
      exitCode,
      stdout: truncateToBytes(stdout, spec.maxOutputBytes),
      stderr: truncateToBytes(stderr || message, spec.maxOutputBytes),
      durationMs: Date.now() - started,
      error: message,
    };
  }
}
