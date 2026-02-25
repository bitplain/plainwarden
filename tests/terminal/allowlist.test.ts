import { describe, expect, it } from "vitest";
import { resolveAllowlistedCommand } from "@/modules/terminal/shell/allowlist";
import { parseCommandLine } from "@/modules/terminal/shell/parse";

describe("shell allowlist", () => {
  it("accepts safe read-only commands", () => {
    const resolved = resolveAllowlistedCommand(parseCommandLine("docker compose ps"));
    expect(resolved?.file).toBe("docker");
    expect(resolved?.args).toEqual(["compose", "ps"]);
  });

  it("normalizes docker stats to --no-stream", () => {
    const resolved = resolveAllowlistedCommand(parseCommandLine("docker stats"));
    expect(resolved?.args).toEqual(["stats", "--no-stream"]);
  });

  it("rejects non-allowlisted commands", () => {
    const resolved = resolveAllowlistedCommand(parseCommandLine("cat /etc/passwd"));
    expect(resolved).toBeNull();
  });

  it("rejects unsafe docker log target", () => {
    const resolved = resolveAllowlistedCommand(parseCommandLine("docker logs ../api"));
    expect(resolved).toBeNull();
  });
});
