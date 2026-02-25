import type { NetdenModule } from "@/modules/core/types";

export const authModule: NetdenModule = {
  id: "auth",
  description: "Session-based authentication",
  routes: ["/login", "/register"],
  guards: [
    "calendar",
    "events",
    "terminal-run",
    "settings",
    "home",
    "notes",
    "github-billing",
    "acme",
  ],
};
