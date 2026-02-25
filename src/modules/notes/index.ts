import type { NetdenModule } from "@/modules/core/types";

export const notesModule: NetdenModule = {
  id: "notes",
  description: "Local notes workspace",
  routes: ["/notes"],
  commands: ["/notes"],
  guards: ["notes"],
};
