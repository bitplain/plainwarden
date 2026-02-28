/**
 * Shared types for cross-module data model.
 *
 * Item is a lightweight abstraction over entities owned by individual modules.
 * ItemLink represents a relationship between two items (any modules).
 */

export type ItemType = "event" | "task" | "note" | "log";

export type ItemLinkRelation =
  | "references"
  | "blocks"
  | "belongs_to"
  | "scheduled_for";

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  content?: string;
  status?: string;
  dateStart?: string;
  dateEnd?: string;
  createdAt: string;
  updatedAt: string;
  meta?: Record<string, unknown>;
  ownerId?: string;
}

export interface ItemLink {
  id: string;
  fromItemId: string;
  toItemId: string;
  relationType: ItemLinkRelation;
  createdAt: string;
}

export interface ModuleToolDescriptor {
  name: string;
  description: string;
  moduleId: string;
  version: string;
  mutating: boolean;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  handler: (
    args: Record<string, unknown>,
    ctx: ToolHandlerContext,
  ) => Promise<ToolHandlerResult>;
}

export interface ToolHandlerContext {
  userId: string;
  nowIso: string;
}

export interface ToolHandlerResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface ModuleRegistration {
  moduleId: string;
  version: string;
  tools: ModuleToolDescriptor[];
}

export interface ActionLogEntry {
  id: string;
  sessionId: string;
  toolName: string;
  args: Record<string, unknown>;
  result: ToolHandlerResult;
  reason?: string;
  createdAt: string;
}

export interface SessionContext {
  sessionId: string;
  userId: string;
  events: SessionEvent[];
  startedAt: string;
}

export interface SessionEvent {
  type: "created" | "updated" | "deleted" | "linked";
  itemType: ItemType;
  itemId: string;
  timestamp: string;
  detail?: string;
}
