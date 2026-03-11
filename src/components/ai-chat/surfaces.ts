import type { Calendar2Tab } from "@/components/calendar2/calendar2-types";

export type AiChatSurfaceId = "ai" | "ai-i";
export type CalendarAiSurfaceId = Extract<Calendar2Tab, AiChatSurfaceId>;
export type AiChatToolbarPlacement = "before-calendar" | "after-notes";

export interface AiChatSurfaceDefinition {
  id: AiChatSurfaceId;
  label: string;
  toolbarVisible: boolean;
  toolbarPlacement: AiChatToolbarPlacement;
  legacy: boolean;
  experimental: boolean;
  widgetTarget: boolean;
}

export interface CalendarAiSurfaceDefinition extends AiChatSurfaceDefinition {
  id: CalendarAiSurfaceId;
}

export const AI_CHAT_SURFACES: readonly AiChatSurfaceDefinition[] = [
  {
    id: "ai-i",
    label: "AI-I",
    toolbarVisible: true,
    toolbarPlacement: "before-calendar",
    legacy: false,
    experimental: true,
    widgetTarget: false,
  },
  {
    id: "ai",
    label: "AI",
    toolbarVisible: false,
    toolbarPlacement: "after-notes",
    legacy: true,
    experimental: false,
    widgetTarget: true,
  },
] as const;

export const DEFAULT_FLOATING_AI_SURFACE_ID: AiChatSurfaceId = "ai";

export function getCalendarAiSurfaceTabs(): readonly CalendarAiSurfaceDefinition[] {
  return AI_CHAT_SURFACES.filter(
    (surface): surface is CalendarAiSurfaceDefinition => surface.toolbarVisible && surface.id !== "ai",
  );
}
