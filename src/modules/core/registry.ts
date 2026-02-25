import type { NetdenModule } from "@/modules/core/types";
import { authModule } from "@/modules/auth";
import { calendarModule } from "@/modules/calendar";
import { settingsModule } from "@/modules/settings";
import { setupModule } from "@/modules/setup";
import { terminalModule } from "@/modules/terminal";

const modules: NetdenModule[] = [
  terminalModule,
  setupModule,
  authModule,
  calendarModule,
  settingsModule,
];

export function listModules(): NetdenModule[] {
  return modules;
}

export function getModule(id: string): NetdenModule | undefined {
  return modules.find((module) => module.id === id);
}
