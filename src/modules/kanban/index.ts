import type { NetdenModule } from "@/modules/core/types";

export const kanbanModule: NetdenModule = {
  id: "kanban",
  description: "Kanban boards with cards, checklists, comments, time tracking and dependencies",
  routes: ["/kanban"],
  commands: ["/kanban"],
  guards: ["kanban"],
};
