import type { NetdenModule } from "@/modules/core/types";

export const homeModule: NetdenModule = {
  id: "home",
  description: "Overview dashboard with summary widgets",
  routes: ["/home"],
  commands: ["/home"],
  guards: ["home"],
};
