import { describe, expect, it } from "vitest";
import { getModule, listModules } from "@/modules/core/registry";

describe("module registry", () => {
  it("contains required modules", () => {
    const ids = listModules().map((module) => module.id);
    expect(ids).toEqual(["terminal", "setup", "auth", "calendar", "home", "kanban", "notes", "settings"]);
  });

  it("contains terminal command declarations", () => {
    const terminal = getModule("terminal");
    expect(terminal?.commands).toContain("/setup");
    expect(terminal?.commands).toContain("/calendar");
    expect(terminal?.commands).toContain("/home");
    expect(terminal?.commands).toContain("/kanban");
    expect(terminal?.commands).toContain("/notes");
    expect(terminal?.commands).toContain("/settings");
    expect(terminal?.commands).toContain("/exit");
  });
});
