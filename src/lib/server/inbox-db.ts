import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import { createRandomId } from "@/lib/random-id";
import prisma from "@/lib/server/prisma";
import { assertPriorityLimit } from "@/lib/server/tasks-db";
import type {
  ConvertInboxItemInput,
  InboxConvertedEntityType,
  InboxItem,
  InboxItemStatus,
  InboxTypeHint,
} from "@/lib/types";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface ConvertInboxResult {
  item: InboxItem;
  converted: {
    type: InboxConvertedEntityType;
    id: string;
  };
}

function toTodayDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function normalizeDate(value: string | undefined): string {
  if (!value) {
    return toTodayDate();
  }
  const normalized = value.trim();
  if (!ISO_DATE_REGEX.test(normalized)) {
    return toTodayDate();
  }
  return normalized;
}

function toPublicInboxItem(item: Prisma.InboxItemGetPayload<Record<string, never>>): InboxItem {
  return {
    id: item.id,
    userId: item.userId,
    content: item.content,
    typeHint: item.typeHint,
    status: item.status,
    convertedToEntityType: item.convertedToEntityType ?? undefined,
    convertedToEntityId: item.convertedToEntityId ?? undefined,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    processedAt: item.processedAt?.toISOString(),
    archivedAt: item.archivedAt?.toISOString(),
  };
}

function buildTaskTitle(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return "Новая задача";
  }
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

function buildNoteTitle(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return "Inbox заметка";
  }
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}

export async function listInboxItemsForUser(
  userId: string,
  status?: InboxItemStatus,
): Promise<InboxItem[]> {
  const items = await prisma.inboxItem.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });

  return items.map(toPublicInboxItem);
}

export async function createInboxItemForUser(input: {
  userId: string;
  content: string;
  typeHint?: InboxTypeHint;
}): Promise<InboxItem> {
  const item = await prisma.inboxItem.create({
    data: {
      userId: input.userId,
      content: input.content,
      typeHint: input.typeHint ?? "task",
      status: "new",
    },
  });

  return toPublicInboxItem(item);
}

export async function archiveInboxItemForUser(userId: string, inboxItemId: string): Promise<InboxItem | null> {
  const updated = await prisma.inboxItem.updateMany({
    where: {
      id: inboxItemId,
      userId,
      status: {
        not: "archived",
      },
    },
    data: {
      status: "archived",
      archivedAt: new Date(),
    },
  });

  if (updated.count === 0) {
    const existing = await prisma.inboxItem.findFirst({
      where: {
        id: inboxItemId,
        userId,
      },
    });
    return existing ? toPublicInboxItem(existing) : null;
  }

  const item = await prisma.inboxItem.findFirst({
    where: {
      id: inboxItemId,
      userId,
    },
  });

  return item ? toPublicInboxItem(item) : null;
}

export async function convertInboxItemForUser(
  userId: string,
  inboxItemId: string,
  input: ConvertInboxItemInput,
): Promise<ConvertInboxResult | null> {
  return prisma.$transaction(async (tx) => {
    const inboxItem = await tx.inboxItem.findFirst({
      where: {
        id: inboxItemId,
        userId,
      },
    });

    if (!inboxItem) {
      return null;
    }

    if (
      inboxItem.status === "processed" &&
      inboxItem.convertedToEntityType &&
      inboxItem.convertedToEntityId
    ) {
      return {
        item: toPublicInboxItem(inboxItem),
        converted: {
          type: inboxItem.convertedToEntityType,
          id: inboxItem.convertedToEntityId,
        },
      };
    }

    const target = input.target;
    const convertedId = createRandomId();
    const now = new Date();

    if (target === "task") {
      const dueDate = input.dueDate ? normalizeDate(input.dueDate) : undefined;
      const isPriority = input.isPriority ?? false;

      if (isPriority && dueDate) {
        await assertPriorityLimit({
          tx,
          userId,
          dueDate,
        });
      }

      await tx.task.create({
        data: {
          id: convertedId,
          userId,
          title: buildTaskTitle(inboxItem.content),
          description: "",
          status: "todo",
          progressMode: "subtasks",
          manualProgress: 0,
          dueDate,
          isPriority,
          sourceInboxItemId: inboxItem.id,
        },
      });
    } else if (target === "event") {
      await tx.event.create({
        data: {
          id: convertedId,
          userId,
          title: buildTaskTitle(inboxItem.content),
          description: "",
          date: normalizeDate(input.date),
          type: "event",
          status: "pending",
        },
      });
    } else {
      const noteTitle = buildNoteTitle(inboxItem.content);

      await tx.note.create({
        data: {
          id: convertedId,
          userId,
          title: noteTitle,
          body: inboxItem.content,
          tags: ["inbox"],
          versions: {
            create: {
              title: noteTitle,
              body: inboxItem.content,
            },
          },
        },
      });
    }

    const updated = await tx.inboxItem.update({
      where: {
        id: inboxItem.id,
      },
      data: {
        status: "processed",
        convertedToEntityType: target,
        convertedToEntityId: convertedId,
        processedAt: now,
        archivedAt: null,
      },
    });

    return {
      item: toPublicInboxItem(updated),
      converted: {
        type: target,
        id: convertedId,
      },
    };
  });
}
