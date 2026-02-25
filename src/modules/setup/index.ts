import type { NetdenModule } from "@/modules/core/types";

export const setupModule: NetdenModule = {
  id: "setup",
  description: "First-run initialization wizard",
  routes: ["/setup"],
  commands: ["/setup"],
};
