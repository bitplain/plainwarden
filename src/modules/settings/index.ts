import type { NetdenModule } from "@/modules/core/types";

export const settingsModule: NetdenModule = {
  id: "settings",
  description: "User preferences for terminal UI",
  routes: ["/settings"],
  commands: ["/settings"],
};
