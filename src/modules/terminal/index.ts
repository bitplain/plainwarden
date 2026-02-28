import type { NetdenModule } from "@/modules/core/types";

export const terminalModule: NetdenModule = {
  id: "terminal",
  description: "Desktop-like command surface",
  routes: ["/"],
  commands: [
    "/setup",
    "/login",
    "/calendar",
    "/calendar2",
    "/home",
    "/kanban",
    "/notes",
    "/settings",
    "/help",
    "/clear",
    "/end cli",
    "/exit",
  ],
};
