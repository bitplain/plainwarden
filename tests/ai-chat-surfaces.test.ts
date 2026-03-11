import { describe, expect, it } from "vitest";
import {
  AI_CHAT_SURFACES,
  DEFAULT_FLOATING_AI_SURFACE_ID,
  getCalendarAiSurfaceTabs,
} from "@/components/ai-chat/surfaces";

describe("AI chat surface registry", () => {
  it("keeps legacy floating surface as default during rollout", () => {
    expect(DEFAULT_FLOATING_AI_SURFACE_ID).toBe("ai");
  });

  it("exposes both legacy and experimental surfaces", () => {
    expect(AI_CHAT_SURFACES.map((surface) => surface.id)).toEqual([
      "ai-i",
      "ai",
    ]);
  });

  it("does not expose standalone ai-i as a calendar tab anymore", () => {
    expect(getCalendarAiSurfaceTabs()).toEqual([]);
  });
});
