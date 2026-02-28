import { describe, expect, it, beforeEach } from "vitest";
import {
  registerModule,
  getModuleRegistration,
  listRegistrations,
  listAllRegisteredTools,
  getRegisteredTool,
  clearRegistry,
} from "@/modules/core/plugin-registry";
import type { ModuleRegistration } from "@/modules/core/shared-types";

const mockRegistration: ModuleRegistration = {
  moduleId: "test-module",
  version: "1.0.0",
  tools: [
    {
      name: "test_tool_read",
      description: "Read test data",
      moduleId: "test-module",
      version: "1.0.0",
      mutating: false,
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
      },
      handler: async () => ({ ok: true, data: [] }),
    },
    {
      name: "test_tool_create",
      description: "Create test data",
      moduleId: "test-module",
      version: "1.0.0",
      mutating: true,
      inputSchema: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
        },
      },
      handler: async () => ({ ok: true, data: { id: "new-1" } }),
    },
  ],
};

describe("plugin registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("registers and retrieves a module", () => {
    registerModule(mockRegistration);
    const reg = getModuleRegistration("test-module");
    expect(reg).toBeDefined();
    expect(reg?.moduleId).toBe("test-module");
    expect(reg?.tools).toHaveLength(2);
  });

  it("lists all registrations", () => {
    registerModule(mockRegistration);
    registerModule({
      moduleId: "another-module",
      version: "1.0.0",
      tools: [],
    });

    const all = listRegistrations();
    expect(all).toHaveLength(2);
    expect(all.map((r) => r.moduleId)).toContain("test-module");
    expect(all.map((r) => r.moduleId)).toContain("another-module");
  });

  it("lists all tools across modules", () => {
    registerModule(mockRegistration);
    const tools = listAllRegisteredTools();
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name)).toEqual(["test_tool_read", "test_tool_create"]);
  });

  it("finds a tool by name", () => {
    registerModule(mockRegistration);
    const tool = getRegisteredTool("test_tool_create");
    expect(tool).toBeDefined();
    expect(tool?.name).toBe("test_tool_create");
    expect(tool?.mutating).toBe(true);
  });

  it("returns undefined for unknown tool", () => {
    registerModule(mockRegistration);
    expect(getRegisteredTool("unknown_tool")).toBeUndefined();
  });

  it("returns undefined for unregistered module", () => {
    expect(getModuleRegistration("nonexistent")).toBeUndefined();
  });

  it("clears all registrations", () => {
    registerModule(mockRegistration);
    expect(listRegistrations()).toHaveLength(1);
    clearRegistry();
    expect(listRegistrations()).toHaveLength(0);
  });
});
