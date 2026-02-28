import type { NetdenModule } from "@/modules/core/types";

export const terminalModule: NetdenModule = {
  id: "terminal",
  description: "Desktop-like command surface",
  routes: ["/"],
  commands: [
    "/setup",
    "/login",
    "/calendar",
    "/settings",
    "/help",
    "/clear",
    "/end cli",
    "/exit",
  ],
};
