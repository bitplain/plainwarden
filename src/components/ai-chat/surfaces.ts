export type AiChatSurfaceId = "ai" | "ai-i";
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

export const AI_CHAT_SURFACES: readonly AiChatSurfaceDefinition[] = [
  {
    id: "ai-i",
    label: "AI-I",
    toolbarVisible: false,
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

export function getCalendarAiSurfaceTabs(): readonly AiChatSurfaceDefinition[] {
  return [];
}
