import { Prisma } from "@prisma/client";
import { addDays, format, startOfWeek } from "date-fns";
import prisma from "@/lib/server/prisma";
import type {
  CreateSubtaskInput,
  CreateTaskInput,
  StatsDaily,
  StatsWeekly,
  Subtask,
  Task,
  TaskProgressMode,
  TaskStatus,
  UpdateSubtaskInput,
  UpdateTaskInput,
} from "@/lib/types";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface TaskListFilters {
  q?: string;
  status?: TaskStatus;
  dueDate?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class TaskNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskNotFoundError";
  }
}

export class TaskPriorityLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskPriorityLimitError";
  }
}

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return Math.round(value);
}

function toPublicSubtask(subtask: Prisma.SubtaskGetPayload<Record<string, never>>): Subtask {
  return {
    id: subtask.id,
    taskId: subtask.taskId,
    title: subtask.title,
    position: subtask.position,
    status: subtask.status,
    estimateMin: subtask.estimateMin ?? undefined,
    createdBy: subtask.createdBy,
    createdAt: subtask.createdAt.toISOString(),
    updatedAt: subtask.updatedAt.toISOString(),
  };
}

export function computeTaskProgress(input: {
  progressMode: TaskProgressMode;
  manualProgress: number;
  subtasksTotal: number;
  subtasksDone: number;
}): number {
  if (input.progressMode === "manual") {
    return clampProgress(input.manualProgress);
  }

  if (input.subtasksTotal <= 0) {
    return 0;
  }

  return clampProgress((input.subtasksDone / input.subtasksTotal) * 100);
}

type TaskWithSubtasks = Prisma.TaskGetPayload<{
  include: {
    subtasks: {
      orderBy: {
        position: "asc";
      };
    };
  };
}>;

function toPublicTask(task: TaskWithSubtasks): Task {
  const subtasksDone = task.subtasks.filter((subtask) => subtask.status === "done").length;
  const subtasksTotal = task.subtasks.length;

  return {
    id: task.id,
    userId: task.userId,
    title: task.title,
    description: task.description,
    status: task.status,
    progressMode: task.progressMode,
    manualProgress: task.manualProgress,
    dueDate: task.dueDate ?? undefined,
    isPriority: task.isPriority,
    linkedEventId: task.linkedEventId ?? undefined,
    sourceInboxItemId: task.sourceInboxItemId ?? undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    subtasksDone,
    subtasksTotal,
    progressPercent: computeTaskProgress({
      progressMode: task.progressMode,
      manualProgress: task.manualProgress,
      subtasksDone,
      subtasksTotal,
    }),
  };
}

function buildTaskWhereInput(userId: string, filters: TaskListFilters): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = { userId };

  if (filters.q) {
    const q = filters.q.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.dueDate) {
    where.dueDate = filters.dueDate;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.dueDate = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    };
  }

  return where;
}

type TaskPriorityTx = Prisma.TransactionClient | typeof prisma;

export async function assertPriorityLimit(input: {
  tx: TaskPriorityTx;
  userId: string;
  dueDate: string;
  excludeTaskId?: string;
}): Promise<void> {
  if (!ISO_DATE_REGEX.test(input.dueDate)) {
    return;
  }

  const count = await input.tx.task.count({
    where: {
      userId: input.userId,
      dueDate: input.dueDate,
      isPriority: true,
      status: {
        not: "done",
      },
      ...(input.excludeTaskId ? { id: { not: input.excludeTaskId } } : {}),
    },
  });

  if (count >= 3) {
    throw new TaskPriorityLimitError("На один день можно запланировать не более 3 приоритетных задач");
  }
}

export async function listTasksForUser(userId: string, filters: TaskListFilters = {}): Promise<Task[]> {
  const tasks = await prisma.task.findMany({
    where: buildTaskWhereInput(userId, filters),
    include: {
      subtasks: {
        orderBy: {
          position: "asc",
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  return tasks.map(toPublicTask);
}

export async function getTaskForUser(userId: string, taskId: string): Promise<Task | null> {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId,
    },
    include: {
      subtasks: {
        orderBy: {
          position: "asc",
        },
      },
    },
  });

  return task ? toPublicTask(task) : null;
}

export async function createTaskForUser(userId: string, input: CreateTaskInput): Promise<Task> {
  return prisma.$transaction(async (tx) => {
    if (input.isPriority && input.dueDate) {
      await assertPriorityLimit({
        tx,
        userId,
        dueDate: input.dueDate,
      });
    }

    const task = await tx.task.create({
      data: {
        userId,
        title: input.title,
        description: input.description ?? "",
        status: input.status ?? "todo",
        progressMode: input.progressMode ?? "subtasks",
        manualProgress: clampProgress(input.manualProgress ?? 0),
        dueDate: input.dueDate,
        isPriority: input.isPriority ?? false,
        sourceInboxItemId: input.sourceInboxItemId,
      },
      include: {
        subtasks: {
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    return toPublicTask(task);
  });
}

export async function updateTaskForUser(
  userId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<Task | null> {
  const existing = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId,
    },
  });

  if (!existing) {
    return null;
  }

  const nextDueDate = input.dueDate === null ? null : (input.dueDate ?? existing.dueDate);
  const nextPriority = input.isPriority ?? existing.isPriority;

  return prisma.$transaction(async (tx) => {
    if (nextPriority && nextDueDate) {
      await assertPriorityLimit({
        tx,
        userId,
        dueDate: nextDueDate,
        excludeTaskId: taskId,
      });
    }

    const updated = await tx.task.update({
      where: {
        id: existing.id,
      },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.progressMode !== undefined ? { progressMode: input.progressMode } : {}),
        ...(input.manualProgress !== undefined ? { manualProgress: clampProgress(input.manualProgress) } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        ...(input.isPriority !== undefined ? { isPriority: input.isPriority } : {}),
      },
      include: {
        subtasks: {
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    return toPublicTask(updated);
  });
}

export async function panicResetTasksForUser(userId: string, fromDate?: string): Promise<{ moved: number; fromDate: string; toDate: string }> {
  const sourceDate = fromDate && ISO_DATE_REGEX.test(fromDate) ? fromDate : toIsoDate(new Date());
  const targetDate = toIsoDate(addDays(new Date(`${sourceDate}T00:00:00.000Z`), 1));

  const result = await prisma.task.updateMany({
    where: {
      userId,
      dueDate: sourceDate,
      status: {
        not: "done",
      },
    },
    data: {
      dueDate: targetDate,
    },
  });

  return {
    moved: result.count,
    fromDate: sourceDate,
    toDate: targetDate,
  };
}

export async function listSubtasksForTask(userId: string, taskId: string): Promise<Subtask[]> {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!task) {
    return [];
  }

  const subtasks = await prisma.subtask.findMany({
    where: {
      taskId: task.id,
    },
    orderBy: {
      position: "asc",
    },
  });

  return subtasks.map(toPublicSubtask);
}

export async function createSubtaskForTask(
  userId: string,
  taskId: string,
  input: CreateSubtaskInput,
): Promise<Subtask> {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!task) {
      throw new TaskNotFoundError("Task not found");
    }

    const tail = await tx.subtask.findFirst({
      where: {
        taskId,
      },
      orderBy: {
        position: "desc",
      },
      select: {
        position: true,
      },
    });

    let position = input.position ?? ((tail?.position ?? -1) + 1);
    if (position < 0) {
      position = 0;
    }

    await tx.subtask.updateMany({
      where: {
        taskId,
        position: {
          gte: position,
        },
      },
      data: {
        position: {
          increment: 1,
        },
      },
    });

    const subtask = await tx.subtask.create({
      data: {
        taskId,
        title: input.title,
        position,
        status: "todo",
        estimateMin: input.estimateMin,
        createdBy: input.createdBy ?? "user",
      },
    });

    return toPublicSubtask(subtask);
  });
}

export async function updateSubtaskForUser(
  userId: string,
  subtaskId: string,
  input: UpdateSubtaskInput,
): Promise<Subtask | null> {
  const existing = await prisma.subtask.findFirst({
    where: {
      id: subtaskId,
      task: {
        userId,
      },
    },
  });

  if (!existing) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    if (input.position !== undefined && input.position !== existing.position) {
      const nextPosition = Math.max(0, input.position);

      if (nextPosition > existing.position) {
        await tx.subtask.updateMany({
          where: {
            taskId: existing.taskId,
            position: {
              gt: existing.position,
              lte: nextPosition,
            },
          },
          data: {
            position: {
              decrement: 1,
            },
          },
        });
      } else {
        await tx.subtask.updateMany({
          where: {
            taskId: existing.taskId,
            position: {
              gte: nextPosition,
              lt: existing.position,
            },
          },
          data: {
            position: {
              increment: 1,
            },
          },
        });
      }
    }

    const updated = await tx.subtask.update({
      where: {
        id: existing.id,
      },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.position !== undefined ? { position: Math.max(0, input.position) } : {}),
        ...(input.estimateMin !== undefined ? { estimateMin: input.estimateMin } : {}),
      },
    });

    return toPublicSubtask(updated);
  });
}

export async function buildDailyStatsForUser(userId: string, date?: string): Promise<StatsDaily> {
  const day = date && ISO_DATE_REGEX.test(date) ? date : toIsoDate(new Date());

  const [tasksCompleted, overdueCount, priorityPlanned] = await Promise.all([
    prisma.task.count({
      where: {
        userId,
        dueDate: day,
        status: "done",
      },
    }),
    prisma.task.count({
      where: {
        userId,
        dueDate: {
          lt: day,
        },
        status: {
          not: "done",
        },
      },
    }),
    prisma.task.count({
      where: {
        userId,
        dueDate: day,
        isPriority: true,
      },
    }),
  ]);

  return {
    date: day,
    tasksCompleted,
    focusMinutes: 0,
    habitsCompleted: 0,
    overdueCount,
    priorityPlanned,
  };
}

export async function buildWeeklyStatsForUser(userId: string, date?: string): Promise<StatsWeekly> {
  const anchor = date && ISO_DATE_REGEX.test(date) ? new Date(`${date}T00:00:00.000Z`) : new Date();
  const weekStart = toIsoDate(startOfWeek(anchor, { weekStartsOn: 1 }));
  const weekEnd = toIsoDate(addDays(new Date(`${weekStart}T00:00:00.000Z`), 6));
  const today = toIsoDate(new Date());

  const [tasksCompleted, overdueCount] = await Promise.all([
    prisma.task.count({
      where: {
        userId,
        status: "done",
        dueDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    }),
    prisma.task.count({
      where: {
        userId,
        dueDate: {
          lt: today,
        },
        status: {
          not: "done",
        },
      },
    }),
  ]);

  return {
    weekStart,
    weekEnd,
    tasksCompleted,
    focusMinutes: 0,
    habitsCompleted: 0,
    overdueCount,
  };
}
