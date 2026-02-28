import { describe, expect, it } from "vitest";
import { getToolsByModules, getToolDescriptor, isMutatingTool } from "@/tools";

describe("tool contracts validation", () => {
  it("all tools have valid structure", () => {
    const tools = getToolsByModules([]);
    expect(tools.length).toBeGreaterThan(0);

    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(typeof tool.name).toBe("string");
      expect(tool.description).toBeTruthy();
      expect(typeof tool.description).toBe("string");
      expect(tool.module).toBeTruthy();
      expect(typeof tool.mutating).toBe("boolean");
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.type).toBe("object");
      expect(typeof tool.execute).toBe("function");
    }
  });

  it("tool names are unique", () => {
    const tools = getToolsByModules([]);
    const names = tools.map((t) => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("calendar tools are present", () => {
    const calendarTools = getToolsByModules(["calendar"]);
    const names = calendarTools.map((t) => t.name);
    expect(names).toContain("calendar_list_events");
    expect(names).toContain("calendar_create_event");
    expect(names).toContain("calendar_update_event");
    expect(names).toContain("calendar_delete_event");
  });

  it("kanban tools are present", () => {
    const kanbanTools = getToolsByModules(["kanban"]);
    const names = kanbanTools.map((t) => t.name);
    expect(names).toContain("kanban_list_boards");
    expect(names).toContain("kanban_list_cards");
    expect(names).toContain("kanban_create_card");
    expect(names).toContain("kanban_update_card");
    expect(names).toContain("kanban_move_card");
    expect(names).toContain("kanban_delete_card");
  });

  it("notes tools are present", () => {
    const notesTools = getToolsByModules(["notes"]);
    const names = notesTools.map((t) => t.name);
    expect(names).toContain("notes_search");
    expect(names).toContain("notes_create");
    expect(names).toContain("notes_update");
    expect(names).toContain("notes_delete");
  });

  it("daily/journal tools are present", () => {
    const dailyTools = getToolsByModules(["daily"]);
    const names = dailyTools.map((t) => t.name);
    expect(names).toContain("daily_overview");
    expect(names).toContain("journal_list");
    expect(names).toContain("journal_get");
    expect(names).toContain("journal_create");
    expect(names).toContain("journal_update");
    expect(names).toContain("journal_delete");
    expect(names).toContain("items_link");
    expect(names).toContain("items_unlink");
    expect(names).toContain("items_list_links");
  });

  it("mutating tools are correctly flagged", () => {
    expect(isMutatingTool("calendar_list_events")).toBe(false);
    expect(isMutatingTool("calendar_create_event")).toBe(true);
    expect(isMutatingTool("calendar_update_event")).toBe(true);
    expect(isMutatingTool("calendar_delete_event")).toBe(true);
    expect(isMutatingTool("journal_list")).toBe(false);
    expect(isMutatingTool("journal_create")).toBe(true);
    expect(isMutatingTool("items_link")).toBe(true);
    expect(isMutatingTool("items_list_links")).toBe(false);
  });

  it("tools have required fields in parameters for mutating tools", () => {
    const tools = getToolsByModules([]);
    const mutatingTools = tools.filter((t) => t.mutating);

    for (const tool of mutatingTools) {
      // All mutating tools with create/update should have required fields
      const params = tool.parameters as { required?: string[] };
      if (tool.name.includes("create") || tool.name.includes("update")) {
        expect(params.required).toBeDefined();
        expect(params.required!.length).toBeGreaterThan(0);
      }
    }
  });

  it("getToolDescriptor returns correct tool", () => {
    const tool = getToolDescriptor("journal_create");
    expect(tool).toBeDefined();
    expect(tool?.name).toBe("journal_create");
    expect(tool?.mutating).toBe(true);
  });

  it("getToolDescriptor returns undefined for unknown", () => {
    expect(getToolDescriptor("nonexistent_tool")).toBeUndefined();
  });
});
