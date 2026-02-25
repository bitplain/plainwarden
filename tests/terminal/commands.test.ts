import { describe, expect, it } from "vitest";
import { executeSlashCommand, getSlashCommands } from "@/modules/terminal/commands";

describe("terminal slash commands", () => {
  it("returns known slash commands", () => {
    const commands = getSlashCommands().map((item) => item.trigger);
    expect(commands).toEqual(["/setup", "/calendar", "/login", "/help", "/clear"]);
  });

  it("handles /clear action", () => {
    const result = executeSlashCommand("/clear");
    expect(result.action).toBe("clear");
    expect(result.output).toEqual([]);
  });

  it("routes /setup to setup page", () => {
    const result = executeSlashCommand("/setup");
    expect(result.action).toBe("navigate");
    expect(result.navigateTo).toBe("/setup");
  });

  it("returns unknown command guidance", () => {
    const result = executeSlashCommand("/unknown");
    expect(result.output.at(0)).toContain("Unknown slash command");
    expect(result.output.at(-1)).toContain("/help");
  });
});
