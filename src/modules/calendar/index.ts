import type { NetdenModule } from "@/modules/core/types";

export const calendarModule: NetdenModule = {
  id: "calendar",
  description: "Primary calendar module (Calendar 2 UI)",
  routes: ["/calendar"],
  commands: ["/calendar"],
};
