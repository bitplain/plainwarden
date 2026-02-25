import type { NetdenModule } from "@/modules/core/types";

export const terminalModule: NetdenModule = {
  id: "terminal",
  description: "Desktop-like command surface",
  routes: ["/"],
  commands: ["/setup", "/calendar", "/login", "/help", "/clear"],
};
