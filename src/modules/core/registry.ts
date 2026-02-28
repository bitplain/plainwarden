import type { NetdenModule } from "@/modules/core/types";
import { authModule } from "@/modules/auth";
import { calendarModule } from "@/modules/calendar";
import { calendar2Module } from "@/modules/calendar2";
import { homeModule } from "@/modules/home";
import { kanbanModule } from "@/modules/kanban";
import { notesModule } from "@/modules/notes";
import { settingsModule } from "@/modules/settings";
import { setupModule } from "@/modules/setup";
import { terminalModule } from "@/modules/terminal";

const modules: NetdenModule[] = [
  terminalModule,
  setupModule,
  authModule,
  calendarModule,
  calendar2Module,
  homeModule,
  kanbanModule,
  notesModule,
  settingsModule,
];

export function listModules(): NetdenModule[] {
  return modules;
}

export function getModule(id: string): NetdenModule | undefined {
  return modules.find((module) => module.id === id);
}
