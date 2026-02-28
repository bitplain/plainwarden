import type { CalendarEvent, KanbanCard, Note } from "@/lib/types";

export type AgentLanguage = "ru" | "en";
export type AgentModule = "calendar" | "kanban" | "notes" | "daily";
export type AgentIntentType = "query" | "action" | "navigate" | "clarify" | "unknown";
export type AgentActionKind = "create" | "update" | "delete" | "move" | "generate";

export interface AgentIntent {
  type: AgentIntentType;
  actionKind?: AgentActionKind;
  confidence: number;
  navigateTo?: string;
  requiresConfirmation: boolean;
}

export interface AgentProfile {
  name: string;
  style: "friendly" | "balanced" | "formal";
  adaptTone: boolean;
}

export interface AgentMemoryItem {
  id: string;
  value: string;
  pinned?: boolean;
  updatedAt: string;
}

export interface AgentSettings {
  profile: AgentProfile;
  role?: string;
}

export interface AgentUserContext {
  userId: string;
  userName: string;
  userRole?: string;
  workspaceId: string;
  timezone: string;
  nowIso: string;
}

export interface AgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface AgentActionProposal {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
  summary: string;
  createdAt: string;
  expiresAt: string;
}

export interface AgentActionDecision {
  actionId: string;
  approved: boolean;
}

export interface AgentTurnInput {
  message?: string;
  sessionId: string;
  history: AgentMessage[];
  memory: AgentMemoryItem[];
  settings: AgentSettings;
  actionDecision?: AgentActionDecision;
}

export interface DailyItem {
  id: string;
  title: string;
  date: string;
  source: "calendar" | "kanban";
  status: "pending" | "done";
  linkedEventId?: string;
}

export interface UnifiedEntity {
  globalEntityId: string;
  title: string;
  sources: AgentModule[];
  date?: string;
  status?: string;
  event?: CalendarEvent;
  cards: KanbanCard[];
  notes: Note[];
}

export interface UnifiedContext {
  entities: UnifiedEntity[];
  promptFragment: string;
}

export interface AgentTurnResult {
  text: string;
  language: AgentLanguage;
  intent: AgentIntent;
  pendingAction?: AgentActionProposal;
  navigateTo?: string;
  usedModules: AgentModule[];
}

export interface ToolExecutionContext {
  userId: string;
  nowIso: string;
}

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface AgentToolDescriptor {
  name: string;
  description: string;
  module: AgentModule;
  mutating: boolean;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, ctx: ToolExecutionContext) => Promise<ToolResult>;
}
