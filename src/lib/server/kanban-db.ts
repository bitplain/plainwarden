import { Prisma } from "@prisma/client";
import prisma from "@/lib/server/prisma";
import { HttpError } from "@/lib/server/validators";
import {
  AddKanbanDependencyInput,
  CreateKanbanBoardInput,
  CreateKanbanCardInput,
  CreateKanbanChecklistInput,
  CreateKanbanChecklistItemInput,
  CreateKanbanCommentInput,
  CreateKanbanColumnInput,
  CreateKanbanWorklogInput,
  KanbanBoard,
  KanbanCard,
  KanbanChecklist,
  KanbanChecklistItem,
  KanbanComment,
  KanbanDependency,
  KanbanWorklog,
  KanbanColumn,
  MoveKanbanCardInput,
  UpdateKanbanBoardInput,
  UpdateKanbanCardInput,
  UpdateKanbanChecklistInput,
  UpdateKanbanChecklistItemInput,
  UpdateKanbanColumnInput,
  UpdateKanbanCommentInput,
} from "@/lib/types";

export class KanbanNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KanbanNotFoundError";
  }
}

export class KanbanDependencyBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KanbanDependencyBlockedError";
  }
}

export class KanbanActiveTimerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KanbanActiveTimerError";
  }
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toBoard(
  b: Prisma.KanbanBoardGetPayload<{ include: { columns: { include: { cards: { select: { id: true; title: true; position: true } } } } } }>,
): KanbanBoard {
  return {
    id: b.id,
    userId: b.userId,
    title: b.title,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    columns: b.columns
      .sort((a, b) => a.position - b.position)
      .map((col) => ({
        id: col.id,
        boardId: col.boardId,
        title: col.title,
        position: col.position,
        wipLimit: col.wipLimit ?? undefined,
        isDone: col.isDone,
        createdAt: col.createdAt.toISOString(),
        updatedAt: col.updatedAt.toISOString(),
        cards: col.cards
          .sort((a, b) => a.position - b.position)
          .map((c) => ({ id: c.id, title: c.title, position: c.position })),
      })),
  };
}

function toBoardSimple(
  b: Prisma.KanbanBoardGetPayload<Record<string, never>>,
): KanbanBoard {
  return {
    id: b.id,
    userId: b.userId,
    title: b.title,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

function toColumn(col: Prisma.KanbanColumnGetPayload<Record<string, never>>): KanbanColumn {
  return {
    id: col.id,
    boardId: col.boardId,
    title: col.title,
    position: col.position,
    wipLimit: col.wipLimit ?? undefined,
    isDone: col.isDone,
    createdAt: col.createdAt.toISOString(),
    updatedAt: col.updatedAt.toISOString(),
  };
}

type CardWithRelations = Prisma.KanbanCardGetPayload<{
  include: {
    checklists: { include: { items: true } };
    worklogs: true;
    dependencies: true;
    eventLinks: true;
  };
}>;

function toCard(card: CardWithRelations): KanbanCard {
  const totalTimeSeconds = card.worklogs
    .filter((w) => w.durationSeconds != null)
    .reduce((sum, w) => sum + (w.durationSeconds ?? 0), 0);

  const activeWorklog = card.worklogs.find((w) => !w.endedAt);

  return {
    id: card.id,
    boardId: card.boardId,
    columnId: card.columnId,
    userId: card.userId,
    title: card.title,
    description: card.description,
    position: card.position,
    dueDate: card.dueDate ?? undefined,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
    checklists: card.checklists
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((cl) => ({
        id: cl.id,
        cardId: cl.cardId,
        title: cl.title,
        createdAt: cl.createdAt.toISOString(),
        updatedAt: cl.updatedAt.toISOString(),
        items: cl.items
          .sort((a, b) => a.position - b.position)
          .map((item) => ({
            id: item.id,
            checklistId: item.checklistId,
            text: item.text,
            completed: item.completed,
            position: item.position,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          })),
      })),
    totalTimeSeconds,
    activeWorklogId: activeWorklog?.id,
    dependencyIds: card.dependencies.map((d) => d.dependsOnId),
    eventLinks: card.eventLinks.map((el) => el.eventId),
  };
}

function toChecklist(
  cl: Prisma.KanbanChecklistGetPayload<{ include: { items: true } }>,
): KanbanChecklist {
  return {
    id: cl.id,
    cardId: cl.cardId,
    title: cl.title,
    createdAt: cl.createdAt.toISOString(),
    updatedAt: cl.updatedAt.toISOString(),
    items: cl.items
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        id: item.id,
        checklistId: item.checklistId,
        text: item.text,
        completed: item.completed,
        position: item.position,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
  };
}

function toChecklistItem(
  item: Prisma.KanbanChecklistItemGetPayload<Record<string, never>>,
): KanbanChecklistItem {
  return {
    id: item.id,
    checklistId: item.checklistId,
    text: item.text,
    completed: item.completed,
    position: item.position,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function toComment(c: Prisma.KanbanCommentGetPayload<Record<string, never>>): KanbanComment {
  return {
    id: c.id,
    cardId: c.cardId,
    userId: c.userId,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function toWorklog(w: Prisma.KanbanWorklogGetPayload<Record<string, never>>): KanbanWorklog {
  return {
    id: w.id,
    cardId: w.cardId,
    userId: w.userId,
    startedAt: w.startedAt.toISOString(),
    endedAt: w.endedAt?.toISOString(),
    durationSeconds: w.durationSeconds ?? undefined,
    note: w.note,
    createdAt: w.createdAt.toISOString(),
  };
}

// ─── Board helpers ────────────────────────────────────────────────────────────

const boardInclude = {
  columns: {
    include: {
      cards: { select: { id: true, title: true, position: true } },
    },
  },
} as const;

async function getBoardOwnedByUser(
  boardId: string,
  userId: string,
): Promise<Prisma.KanbanBoardGetPayload<typeof boardInclude> | null> {
  return prisma.kanbanBoard.findFirst({
    where: { id: boardId, userId },
    include: boardInclude,
  });
}

const cardInclude = {
  checklists: { include: { items: true } },
  worklogs: true,
  dependencies: true,
  eventLinks: true,
} as const;

async function getCardWithAccess(
  cardId: string,
  userId: string,
): Promise<CardWithRelations | null> {
  return prisma.kanbanCard.findFirst({
    where: { id: cardId, userId },
    include: cardInclude,
  });
}

// ─── Boards ───────────────────────────────────────────────────────────────────

export async function listBoardsForUser(userId: string): Promise<KanbanBoard[]> {
  const boards = await prisma.kanbanBoard.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return boards.map(toBoardSimple);
}

export async function getBoardForUser(userId: string, boardId: string): Promise<KanbanBoard | null> {
  const board = await getBoardOwnedByUser(boardId, userId);
  return board ? toBoard(board) : null;
}

export async function createBoardForUser(
  userId: string,
  input: CreateKanbanBoardInput,
): Promise<KanbanBoard> {
  const board = await prisma.kanbanBoard.create({
    data: { userId, title: input.title },
  });
  return toBoardSimple(board);
}

export async function updateBoardForUser(
  userId: string,
  boardId: string,
  input: UpdateKanbanBoardInput,
): Promise<KanbanBoard | null> {
  try {
    const board = await prisma.kanbanBoard.update({
      where: { id: boardId, userId },
      data: { ...(input.title !== undefined && { title: input.title }) },
    });
    return toBoardSimple(board);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }
    throw error;
  }
}

export async function deleteBoardForUser(userId: string, boardId: string): Promise<boolean> {
  const deleted = await prisma.kanbanBoard.deleteMany({ where: { id: boardId, userId } });
  return deleted.count > 0;
}

// ─── Columns ──────────────────────────────────────────────────────────────────

export async function createColumnForBoard(
  userId: string,
  boardId: string,
  input: CreateKanbanColumnInput,
): Promise<KanbanColumn | null> {
  const board = await prisma.kanbanBoard.findFirst({ where: { id: boardId, userId } });
  if (!board) return null;

  const col = await prisma.kanbanColumn.create({
    data: {
      boardId,
      title: input.title,
      position: input.position,
      wipLimit: input.wipLimit ?? null,
      isDone: input.isDone ?? false,
    },
  });
  return toColumn(col);
}

export async function updateColumnForUser(
  userId: string,
  columnId: string,
  input: UpdateKanbanColumnInput,
): Promise<KanbanColumn | null> {
  const col = await prisma.kanbanColumn.findFirst({
    where: { id: columnId, board: { userId } },
  });
  if (!col) return null;

  const updateData: Prisma.KanbanColumnUpdateInput = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.position !== undefined) updateData.position = input.position;
  if ("wipLimit" in input) updateData.wipLimit = input.wipLimit ?? null;
  if (input.isDone !== undefined) updateData.isDone = input.isDone;

  const updated = await prisma.kanbanColumn.update({
    where: { id: columnId },
    data: updateData,
  });
  return toColumn(updated);
}

export async function deleteColumnForUser(userId: string, columnId: string): Promise<boolean> {
  const col = await prisma.kanbanColumn.findFirst({
    where: { id: columnId, board: { userId } },
  });
  if (!col) return false;

  await prisma.kanbanColumn.delete({ where: { id: columnId } });
  return true;
}

// ─── Cards ────────────────────────────────────────────────────────────────────

export async function listCardsInColumn(
  userId: string,
  columnId: string,
): Promise<KanbanCard[]> {
  const col = await prisma.kanbanColumn.findFirst({
    where: { id: columnId, board: { userId } },
  });
  if (!col) return [];

  const cards = await prisma.kanbanCard.findMany({
    where: { columnId },
    include: cardInclude,
    orderBy: { position: "asc" },
  });
  return cards.map(toCard);
}

export async function getCardForUser(userId: string, cardId: string): Promise<KanbanCard | null> {
  const card = await getCardWithAccess(cardId, userId);
  return card ? toCard(card) : null;
}

export async function createCardInColumn(
  userId: string,
  columnId: string,
  input: CreateKanbanCardInput,
): Promise<KanbanCard | null> {
  const col = await prisma.kanbanColumn.findFirst({
    where: { id: columnId, board: { userId } },
    include: { board: true },
  });
  if (!col) return null;

  return prisma.$transaction(async (tx) => {
    const card = await tx.kanbanCard.create({
      data: {
        boardId: col.boardId,
        columnId,
        userId,
        title: input.title,
        description: input.description ?? "",
        position: input.position,
        dueDate: input.dueDate ?? null,
      },
      include: cardInclude,
    });

    if (input.eventLinks && input.eventLinks.length > 0) {
      await tx.kanbanCardEventLink.createMany({
        data: input.eventLinks.map((eventId) => ({ cardId: card.id, eventId })),
        skipDuplicates: true,
      });
    }

    const fresh = await tx.kanbanCard.findUniqueOrThrow({
      where: { id: card.id },
      include: cardInclude,
    });

    return toCard(fresh);
  });
}

export async function updateCardForUser(
  userId: string,
  cardId: string,
  input: UpdateKanbanCardInput,
): Promise<KanbanCard | null> {
  const card = await prisma.kanbanCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return null;

  return prisma.$transaction(async (tx) => {
    const updateData: Prisma.KanbanCardUpdateInput = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if ("dueDate" in input) updateData.dueDate = input.dueDate ?? null;

    await tx.kanbanCard.update({ where: { id: cardId }, data: updateData });

    if (input.eventLinks !== undefined) {
      await tx.kanbanCardEventLink.deleteMany({ where: { cardId } });
      if (input.eventLinks.length > 0) {
        await tx.kanbanCardEventLink.createMany({
          data: input.eventLinks.map((eventId) => ({ cardId, eventId })),
          skipDuplicates: true,
        });
      }
    }

    const fresh = await tx.kanbanCard.findUniqueOrThrow({
      where: { id: cardId },
      include: cardInclude,
    });

    return toCard(fresh);
  });
}

export async function deleteCardForUser(userId: string, cardId: string): Promise<boolean> {
  const deleted = await prisma.kanbanCard.deleteMany({ where: { id: cardId, userId } });
  return deleted.count > 0;
}

export async function moveCardForUser(
  userId: string,
  cardId: string,
  input: MoveKanbanCardInput,
): Promise<KanbanCard | null> {
  const card = await prisma.kanbanCard.findFirst({
    where: { id: cardId, userId },
    include: { dependencies: true },
  });
  if (!card) return null;

  const targetColumn = await prisma.kanbanColumn.findFirst({
    where: { id: input.columnId, board: { userId } },
  });
  if (!targetColumn) return null;

  // Dependency guard: if target column is marked as done, verify all blocking cards are done
  if (targetColumn.isDone && card.dependencies.length > 0) {
    const blockingIds = card.dependencies.map((d) => d.dependsOnId);
    const blocking = await prisma.kanbanCard.findMany({
      where: {
        id: { in: blockingIds },
        column: { isDone: false },
      },
      select: { id: true, title: true },
    });

    if (blocking.length > 0) {
      const titles = blocking.map((b) => `"${b.title}"`).join(", ");
      throw new KanbanDependencyBlockedError(
        `Cannot move card to done column: unfinished dependencies: ${titles}`,
      );
    }
  }

  const updated = await prisma.kanbanCard.update({
    where: { id: cardId },
    data: { columnId: input.columnId, position: input.position },
    include: cardInclude,
  });
  return toCard(updated);
}

// ─── Checklists ───────────────────────────────────────────────────────────────

export async function listChecklistsForCard(
  userId: string,
  cardId: string,
): Promise<KanbanChecklist[]> {
  const card = await prisma.kanbanCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return [];

  const checklists = await prisma.kanbanChecklist.findMany({
    where: { cardId },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });
  return checklists.map(toChecklist);
}

export async function createChecklistForCard(
  userId: string,
  cardId: string,
  input: CreateKanbanChecklistInput,
): Promise<KanbanChecklist | null> {
  const card = await prisma.kanbanCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return null;

  const cl = await prisma.kanbanChecklist.create({
    data: { cardId, title: input.title },
    include: { items: true },
  });
  return toChecklist(cl);
}

export async function updateChecklistForUser(
  userId: string,
  checklistId: string,
  input: UpdateKanbanChecklistInput,
): Promise<KanbanChecklist | null> {
  const cl = await prisma.kanbanChecklist.findFirst({
    where: { id: checklistId, card: { userId } },
  });
  if (!cl) return null;

  const updated = await prisma.kanbanChecklist.update({
    where: { id: checklistId },
    data: { ...(input.title !== undefined && { title: input.title }) },
    include: { items: true },
  });
  return toChecklist(updated);
}

export async function deleteChecklistForUser(userId: string, checklistId: string): Promise<boolean> {
  const cl = await prisma.kanbanChecklist.findFirst({
    where: { id: checklistId, card: { userId } },
  });
  if (!cl) return false;

  await prisma.kanbanChecklist.delete({ where: { id: checklistId } });
  return true;
}

export async function createChecklistItem(
  userId: string,
  checklistId: string,
  input: CreateKanbanChecklistItemInput,
): Promise<KanbanChecklistItem | null> {
  const cl = await prisma.kanbanChecklist.findFirst({
    where: { id: checklistId, card: { userId } },
  });
  if (!cl) return null;

  const item = await prisma.kanbanChecklistItem.create({
    data: {
      checklistId,
      text: input.text,
      position: input.position,
    },
  });
  return toChecklistItem(item);
}

export async function updateChecklistItem(
  userId: string,
  itemId: string,
  input: UpdateKanbanChecklistItemInput,
): Promise<KanbanChecklistItem | null> {
  const item = await prisma.kanbanChecklistItem.findFirst({
    where: { id: itemId, checklist: { card: { userId } } },
  });
  if (!item) return null;

  const updateData: Prisma.KanbanChecklistItemUpdateInput = {};
  if (input.text !== undefined) updateData.text = input.text;
  if (input.completed !== undefined) updateData.completed = input.completed;
  if (input.position !== undefined) updateData.position = input.position;

  const updated = await prisma.kanbanChecklistItem.update({
    where: { id: itemId },
    data: updateData,
  });
  return toChecklistItem(updated);
}

export async function deleteChecklistItem(userId: string, itemId: string): Promise<boolean> {
  const item = await prisma.kanbanChecklistItem.findFirst({
    where: { id: itemId, checklist: { card: { userId } } },
  });
  if (!item) return false;

  await prisma.kanbanChecklistItem.delete({ where: { id: itemId } });
  return true;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function listCommentsForCard(
  userId: string,
  cardId: string,
): Promise<KanbanComment[]> {
  const card = await prisma.kanbanCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return [];

  const comments = await prisma.kanbanComment.findMany({
    where: { cardId },
    orderBy: { createdAt: "asc" },
  });
  return comments.map(toComment);
}

export async function createCommentForCard(
  userId: string,
  cardId: string,
  input: CreateKanbanCommentInput,
): Promise<KanbanComment | null> {
  const card = await prisma.kanbanCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return null;

  const comment = await prisma.kanbanComment.create({
    data: { cardId, userId, body: input.body },
  });
  return toComment(comment);
}

export async function updateCommentForUser(
  userId: string,
  commentId: string,
  input: UpdateKanbanCommentInput,
): Promise<KanbanComment | null> {
  const comment = await prisma.kanbanComment.findFirst({
    where: { id: commentId, userId },
  });
  if (!comment) return null;

  const updated = await prisma.kanbanComment.update({
    where: { id: commentId },
    data: { body: input.body },
  });
  return toComment(updated);
}

export async function deleteCommentForUser(userId: string, commentId: string): Promise<boolean> {
  const deleted = await prisma.kanbanComment.deleteMany({
    where: { id: commentId, userId },
  });
  return deleted.count > 0;
}

// ─── Worklog ──────────────────────────────────────────────────────────────────

export async function listWorklogsForCard(
  userId: string,
  cardId: string,
): Promise<KanbanWorklog[]> {
  const card = await prisma.kanbanCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return [];

  const logs = await prisma.kanbanWorklog.findMany({
    where: { cardId },
    orderBy: { startedAt: "asc" },
  });
  return logs.map(toWorklog);
}

export async function addManualWorklog(
  userId: string,
  cardId: string,
  input: CreateKanbanWorklogInput,
): Promise<KanbanWorklog | null> {
  const card = await prisma.kanbanCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return null;

  const startedAt = new Date(input.startedAt);
  const endedAt = new Date(input.endedAt);
  const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));

  const log = await prisma.kanbanWorklog.create({
    data: {
      cardId,
      userId,
      startedAt,
      endedAt,
      durationSeconds,
      note: input.note ?? "",
    },
  });
  return toWorklog(log);
}

export async function startWorklogTimer(
  userId: string,
  cardId: string,
): Promise<KanbanWorklog | null> {
  const card = await prisma.kanbanCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return null;

  const active = await prisma.kanbanWorklog.findFirst({
    where: { cardId, userId, endedAt: null },
  });
  if (active) {
    throw new KanbanActiveTimerError("A timer is already running for this card");
  }

  const log = await prisma.kanbanWorklog.create({
    data: { cardId, userId, startedAt: new Date() },
  });
  return toWorklog(log);
}

export async function stopWorklogTimer(
  userId: string,
  cardId: string,
  note?: string,
): Promise<KanbanWorklog | null> {
  const card = await prisma.kanbanCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return null;

  const active = await prisma.kanbanWorklog.findFirst({
    where: { cardId, userId, endedAt: null },
  });
  if (!active) {
    throw new KanbanNotFoundError("No active timer for this card");
  }

  const endedAt = new Date();
  const durationSeconds = Math.max(
    0,
    Math.floor((endedAt.getTime() - active.startedAt.getTime()) / 1000),
  );

  const log = await prisma.kanbanWorklog.update({
    where: { id: active.id },
    data: {
      endedAt,
      durationSeconds,
      ...(note !== undefined && { note }),
    },
  });
  return toWorklog(log);
}

// ─── Dependencies ─────────────────────────────────────────────────────────────

export async function listDependenciesForCard(
  userId: string,
  cardId: string,
): Promise<KanbanDependency[]> {
  const card = await prisma.kanbanCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return [];

  const deps = await prisma.kanbanDependency.findMany({ where: { cardId } });
  return deps.map((d) => ({ id: d.id, cardId: d.cardId, dependsOnId: d.dependsOnId }));
}

export async function addDependencyForCard(
  userId: string,
  cardId: string,
  input: AddKanbanDependencyInput,
): Promise<KanbanDependency | null> {
  const card = await prisma.kanbanCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return null;

  if (cardId === input.dependsOnId) {
    throw new HttpError(400, "A card cannot depend on itself");
  }

  const target = await prisma.kanbanCard.findFirst({
    where: { id: input.dependsOnId, userId },
  });
  if (!target) return null;

  try {
    const dep = await prisma.kanbanDependency.create({
      data: { cardId, dependsOnId: input.dependsOnId },
    });
    return { id: dep.id, cardId: dep.cardId, dependsOnId: dep.dependsOnId };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.kanbanDependency.findFirst({
        where: { cardId, dependsOnId: input.dependsOnId },
      });
      if (existing) {
        return { id: existing.id, cardId: existing.cardId, dependsOnId: existing.dependsOnId };
      }
    }
    throw error;
  }
}

export async function removeDependencyForCard(
  userId: string,
  depId: string,
): Promise<boolean> {
  const dep = await prisma.kanbanDependency.findFirst({
    where: { id: depId, card: { userId } },
  });
  if (!dep) return false;

  await prisma.kanbanDependency.delete({ where: { id: depId } });
  return true;
}
