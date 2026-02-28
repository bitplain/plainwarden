import type { AgentModule, AgentToolDescriptor, ToolExecutionContext, ToolResult } from "@/agent/types";
import { calendarTools } from "@/tools/calendar";
import { dailyTools } from "@/tools/daily";
import { journalTools } from "@/tools/journal";
import { kanbanTools } from "@/tools/kanban";
import { linkTools } from "@/tools/links";
import { notesTools } from "@/tools/notes";

const ALL_TOOLS: AgentToolDescriptor[] = [
  ...calendarTools,
  ...kanbanTools,
  ...notesTools,
  ...dailyTools,
  ...journalTools,
  ...linkTools,
];

const TOOL_MAP = new Map(ALL_TOOLS.map((tool) => [tool.name, tool]));

export function getToolsByModules(modules: AgentModule[]): AgentToolDescriptor[] {
  if (modules.length === 0) {
    return ALL_TOOLS;
  }

  const wanted = new Set(modules);
  return ALL_TOOLS.filter((tool) => wanted.has(tool.module));
}

export function getOpenRouterTools(modules: AgentModule[]) {
  return getToolsByModules(modules).map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export function isMutatingTool(toolName: string): boolean {
  return TOOL_MAP.get(toolName)?.mutating ?? false;
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolExecutionContext,
): Promise<ToolResult> {
  const tool = TOOL_MAP.get(toolName);
  if (!tool) {
    return {
      ok: false,
      error: `Unknown tool: ${toolName}`,
    };
  }

  try {
    return await tool.execute(args, ctx);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Tool execution failed",
    };
  }
}

export async function executeToolsParallel(
  calls: Array<{ toolName: string; args: Record<string, unknown>; toolCallId?: string }>,
  ctx: ToolExecutionContext,
) {
  return Promise.all(
    calls.map(async (call) => ({
      toolName: call.toolName,
      toolCallId: call.toolCallId,
      result: await executeTool(call.toolName, call.args, ctx),
    })),
  );
}

export function getToolDescriptor(toolName: string): AgentToolDescriptor | undefined {
  return TOOL_MAP.get(toolName);
}
