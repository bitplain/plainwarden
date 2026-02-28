import type { AgentToolDescriptor, ToolExecutionContext, ToolResult } from "@/agent/types";
import {
  createCardInColumn,
  deleteCardForUser,
  listBoardsForUser,
  moveCardForUser,
  updateCardForUser,
} from "@/lib/server/kanban-db";
import prisma from "@/lib/server/prisma";

function toStringValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toNumberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

async function listBoards(_: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  const boards = await listBoardsForUser(ctx.userId);
  return {
    ok: true,
    data: boards,
  };
}

async function listCards(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  const boardId = toStringValue(args.boardId);
  const where = boardId ? { userId: ctx.userId, boardId } : { userId: ctx.userId };

  const cards = await prisma.kanbanCard.findMany({
    where,
    include: {
      eventLinks: true,
    },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    take: 100,
  });

  return {
    ok: true,
    data: cards.map((card) => ({
      id: card.id,
      title: card.title,
      description: card.description,
      dueDate: card.dueDate,
      boardId: card.boardId,
      columnId: card.columnId,
      position: card.position,
      eventLinks: card.eventLinks.map((item) => item.eventId),
    })),
  };
}

async function createCard(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  const columnId = toStringValue(args.columnId);
  const title = toStringValue(args.title);

  if (!columnId || !title) {
    return { ok: false, error: "columnId and title are required" };
  }

  const card = await createCardInColumn(ctx.userId, columnId, {
    title,
    description: toStringValue(args.description) ?? "",
    position: Math.max(0, Math.floor(toNumberValue(args.position) ?? 0)),
    dueDate: toStringValue(args.dueDate),
    eventLinks: Array.isArray(args.eventLinks)
      ? args.eventLinks.filter((item): item is string => typeof item === "string")
      : [],
  });

  if (!card) {
    return { ok: false, error: "column not found" };
  }

  return {
    ok: true,
    data: card,
  };
}

async function updateCard(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  const cardId = toStringValue(args.cardId);
  if (!cardId) {
    return { ok: false, error: "cardId is required" };
  }

  const card = await updateCardForUser(ctx.userId, cardId, {
    title: toStringValue(args.title),
    description: toStringValue(args.description),
    dueDate: args.dueDate === null ? null : toStringValue(args.dueDate),
    eventLinks: Array.isArray(args.eventLinks)
      ? args.eventLinks.filter((item): item is string => typeof item === "string")
      : undefined,
  });

  if (!card) {
    return { ok: false, error: "card not found" };
  }

  return {
    ok: true,
    data: card,
  };
}

async function moveCard(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  const cardId = toStringValue(args.cardId);
  const columnId = toStringValue(args.columnId);
  const position = Math.max(0, Math.floor(toNumberValue(args.position) ?? 0));

  if (!cardId || !columnId) {
    return { ok: false, error: "cardId and columnId are required" };
  }

  const card = await moveCardForUser(ctx.userId, cardId, { columnId, position });
  if (!card) {
    return { ok: false, error: "card or column not found" };
  }

  return {
    ok: true,
    data: card,
  };
}

async function deleteCard(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  const cardId = toStringValue(args.cardId);
  if (!cardId) {
    return { ok: false, error: "cardId is required" };
  }

  const deleted = await deleteCardForUser(ctx.userId, cardId);
  return {
    ok: deleted,
    data: { deleted },
    error: deleted ? undefined : "card not found",
  };
}

export const kanbanTools: AgentToolDescriptor[] = [
  {
    name: "kanban_list_boards",
    module: "kanban",
    mutating: false,
    description: "List kanban boards",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: listBoards,
  },
  {
    name: "kanban_list_cards",
    module: "kanban",
    mutating: false,
    description: "List kanban cards with optional board filter",
    parameters: {
      type: "object",
      properties: {
        boardId: { type: "string" },
      },
    },
    execute: listCards,
  },
  {
    name: "kanban_create_card",
    module: "kanban",
    mutating: true,
    description: "Create card in a kanban column",
    parameters: {
      type: "object",
      required: ["columnId", "title"],
      properties: {
        columnId: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        position: { type: "number" },
        dueDate: { type: "string" },
        eventLinks: { type: "array", items: { type: "string" } },
      },
    },
    execute: createCard,
  },
  {
    name: "kanban_update_card",
    module: "kanban",
    mutating: true,
    description: "Update kanban card fields",
    parameters: {
      type: "object",
      required: ["cardId"],
      properties: {
        cardId: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        dueDate: { type: ["string", "null"] },
        eventLinks: { type: "array", items: { type: "string" } },
      },
    },
    execute: updateCard,
  },
  {
    name: "kanban_move_card",
    module: "kanban",
    mutating: true,
    description: "Move card to another column",
    parameters: {
      type: "object",
      required: ["cardId", "columnId"],
      properties: {
        cardId: { type: "string" },
        columnId: { type: "string" },
        position: { type: "number" },
      },
    },
    execute: moveCard,
  },
  {
    name: "kanban_delete_card",
    module: "kanban",
    mutating: true,
    description: "Delete card by id",
    parameters: {
      type: "object",
      required: ["cardId"],
      properties: {
        cardId: { type: "string" },
      },
    },
    execute: deleteCard,
  },
];
