import type { NetdenModule } from "@/modules/core/types";

export const journalModule: NetdenModule = {
  id: "journal",
  description: "Daily journal / log entries",
  routes: ["/journal"],
  commands: ["/journal"],
  toolsVersion: "1.0.0",
};
