import type { NetdenModule } from "@/modules/core/types";

export const calendarModule: NetdenModule = {
  id: "calendar",
  description: "Calendar module with CRUD",
  routes: ["/calendar"],
  commands: ["/calendar"],
};
