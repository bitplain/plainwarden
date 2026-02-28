/**
 * AI Core Plugin Registry.
 *
 * Modules register their tools here. AI Core queries the registry
 * to discover available operations and their schemas.
 */

import type { ModuleRegistration, ModuleToolDescriptor } from "@/modules/core/shared-types";

const registrations = new Map<string, ModuleRegistration>();

export function registerModule(reg: ModuleRegistration): void {
  registrations.set(reg.moduleId, reg);
}

export function getModuleRegistration(moduleId: string): ModuleRegistration | undefined {
  return registrations.get(moduleId);
}

export function listRegistrations(): ModuleRegistration[] {
  return Array.from(registrations.values());
}

export function listAllRegisteredTools(): ModuleToolDescriptor[] {
  const tools: ModuleToolDescriptor[] = [];
  for (const reg of registrations.values()) {
    tools.push(...reg.tools);
  }
  return tools;
}

export function getRegisteredTool(toolName: string): ModuleToolDescriptor | undefined {
  for (const reg of registrations.values()) {
    const tool = reg.tools.find((t) => t.name === toolName);
    if (tool) return tool;
  }
  return undefined;
}

export function clearRegistry(): void {
  registrations.clear();
}
