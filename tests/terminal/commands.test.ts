import { describe, expect, it } from "vitest";
import { executeSlashCommand, getSlashCommands } from "@/modules/terminal/commands";

describe("terminal slash commands", () => {
  it("returns only /login for guest mode", () => {
    const commands = getSlashCommands({
      isAuthenticated: false,
      isSetupRequired: false,
    }).map((item) => item.trigger);

    expect(commands).toEqual(["/login"]);
  });

  it("returns setup-only commands when setup is required", () => {
    const commands = getSlashCommands({
      isAuthenticated: false,
      isSetupRequired: true,
    }).map((item) => item.trigger);

    expect(commands).toEqual(["/setup"]);
  });

  it("returns login action for guest mode", () => {
    const result = executeSlashCommand("/login", {
      isAuthenticated: false,
      isSetupRequired: false,
    });

    expect(result.action).toBe("login");
    expect(result.silent).toBe(true);
    expect(result.output).toEqual([]);
  });

  it("accepts guest command without slash", () => {
    const result = executeSlashCommand("login", {
      isAuthenticated: false,
      isSetupRequired: false,
    });

    expect(result.action).toBe("login");
    expect(result.silent).toBe(true);
    expect(result.output).toEqual([]);
  });

  it("handles /clear action for authenticated mode", () => {
    const result = executeSlashCommand("/clear", {
      isAuthenticated: true,
      isSetupRequired: false,
    });

    expect(result.action).toBe("clear");
    expect(result.output).toEqual([]);
  });

  it("returns /exit logout action for authenticated mode", () => {
    const result = executeSlashCommand("/exit", {
      isAuthenticated: true,
      isSetupRequired: false,
    });

    expect(result.action).toBe("logout");
    expect(result.silent).toBe(true);
    expect(result.output).toEqual([]);
  });

  it("returns /end cli undock action for authenticated mode", () => {
    const result = executeSlashCommand("end cli", {
      isAuthenticated: true,
      isSetupRequired: false,
    });

    expect(result.action).toBe("undock");
  });

  it("opens inline calendar from /calendar", () => {
    const result = executeSlashCommand("/calendar", {
      isAuthenticated: true,
      isSetupRequired: false,
    });

    expect(result.action).toBe("open_calendar");
  });

  it("opens inline calendar from calendar alias", () => {
    const result = executeSlashCommand("calendar", {
      isAuthenticated: true,
      isSetupRequired: false,
    });

    expect(result.action).toBe("open_calendar");
  });

  it("opens inline calendar from russian alias", () => {
    const result = executeSlashCommand("календарь", {
      isAuthenticated: true,
      isSetupRequired: false,
    });

    expect(result.action).toBe("open_calendar");
  });

  it("navigates to /home command", () => {
    const result = executeSlashCommand("home", {
      isAuthenticated: true,
      isSetupRequired: false,
    });

    expect(result.action).toBe("navigate");
    expect(result.navigateTo).toBe("/home");
  });

  it("navigates to /notes command", () => {
    const result = executeSlashCommand("/notes", {
      isAuthenticated: true,
      isSetupRequired: false,
    });

    expect(result.action).toBe("navigate");
    expect(result.navigateTo).toBe("/notes");
  });

  it("does not allow calendar command for guest mode", () => {
    const result = executeSlashCommand("calendar", {
      isAuthenticated: false,
      isSetupRequired: false,
    });

    expect(result.action).toBeUndefined();
    expect(result.output.at(-1)).toContain("/login");
  });

  it("returns unknown command guidance", () => {
    const result = executeSlashCommand("/unknown", {
      isAuthenticated: true,
      isSetupRequired: false,
    });

    expect(result.output.at(0)).toContain("Unknown slash command");
    expect(result.output.at(-1)).toContain("/settings");
  });
});
