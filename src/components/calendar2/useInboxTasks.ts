"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type {
  ConvertInboxItemInput,
  CreateTaskInput,
  InboxAiAnalysis,
  InboxConvertedEntityType,
  InboxTypeHint,
  SubtaskStatus,
  Task,
  UpdateTaskInput,
} from "@/lib/types";
import type { InboxTasksState } from "./inbox-types";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unexpected error";
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const dateA = a.dueDate ?? "9999-99-99";
    const dateB = b.dueDate ?? "9999-99-99";
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    if (a.isPriority !== b.isPriority) {
      return a.isPriority ? -1 : 1;
    }

    return a.createdAt.localeCompare(b.createdAt);
  });
}

function filterRecordByIds<T>(input: Record<string, T>, ids: Set<string>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => ids.has(key)),
  ) as Record<string, T>;
}

function omitKey<T>(input: Record<string, T>, key: string): Record<string, T> {
  const next = { ...input };
  delete next[key];
  return next;
}

export function useInboxTasks(anchorDateKey: string) {
  const [state, setState] = useState<InboxTasksState>({
    loading: true,
    error: null,
    inbox: {
      newItems: [],
      processedItems: [],
      archivedItems: [],
    },
    tasks: [],
    subtasksByTaskId: {},
    dailyStats: null,
    weeklyStats: null,
    analysisByItemId: {},
    analysisErrorByItemId: {},
    analysisLoadingItemId: null,
  });

  const refreshCore = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [newItems, processedItems, archivedItems, tasks] = await Promise.all([
        api.listInbox("new"),
        api.listInbox("processed"),
        api.listInbox("archived"),
        api.listTasks(),
      ]);
      const itemIds = new Set(
        [...newItems, ...processedItems, ...archivedItems].map((item) => item.id),
      );

      setState((prev) => ({
        ...prev,
        loading: false,
        error: null,
        inbox: {
          newItems,
          processedItems,
          archivedItems,
        },
        tasks: sortTasks(tasks),
        analysisByItemId: filterRecordByIds(prev.analysisByItemId, itemIds),
        analysisErrorByItemId: filterRecordByIds(prev.analysisErrorByItemId, itemIds),
        analysisLoadingItemId:
          prev.analysisLoadingItemId && itemIds.has(prev.analysisLoadingItemId)
            ? prev.analysisLoadingItemId
            : null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error),
      }));
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const [dailyStats, weeklyStats] = await Promise.all([
        api.getDailyStats(anchorDateKey),
        api.getWeeklyStats(anchorDateKey),
      ]);
      setState((prev) => ({
        ...prev,
        dailyStats,
        weeklyStats,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: prev.error ?? getErrorMessage(error),
      }));
    }
  }, [anchorDateKey]);

  const refreshAll = useCallback(async () => {
    await refreshCore();
    await refreshStats();
  }, [refreshCore, refreshStats]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  const createInboxItem = useCallback(
    async (content: string, typeHint?: InboxTypeHint) => {
      const trimmed = content.trim();
      if (!trimmed) {
        return;
      }

      await api.createInboxItem({
        content: trimmed,
        typeHint,
      });

      await refreshAll();
    },
    [refreshAll],
  );

  const convertInboxItem = useCallback(
    async (
      id: string,
      target: InboxConvertedEntityType,
      options: Omit<ConvertInboxItemInput, "target"> = {},
    ) => {
      await api.convertInboxItem(id, {
        target,
        ...options,
      });
      setState((prev) => ({
        ...prev,
        analysisByItemId: omitKey(prev.analysisByItemId, id),
        analysisErrorByItemId: omitKey(prev.analysisErrorByItemId, id),
        analysisLoadingItemId: prev.analysisLoadingItemId === id ? null : prev.analysisLoadingItemId,
      }));

      await refreshAll();
    },
    [refreshAll],
  );

  const archiveInboxItem = useCallback(
    async (id: string) => {
      await api.archiveInboxItem(id);
      setState((prev) => ({
        ...prev,
        analysisByItemId: omitKey(prev.analysisByItemId, id),
        analysisErrorByItemId: omitKey(prev.analysisErrorByItemId, id),
        analysisLoadingItemId: prev.analysisLoadingItemId === id ? null : prev.analysisLoadingItemId,
      }));
      await refreshAll();
    },
    [refreshAll],
  );

  const analyzeInboxItem = useCallback(
    async (id: string): Promise<InboxAiAnalysis | undefined> => {
      setState((prev) => ({
        ...prev,
        analysisLoadingItemId: id,
        analysisErrorByItemId: omitKey(prev.analysisErrorByItemId, id),
      }));

      try {
        const analysis = await api.analyzeInboxItem(id);
        setState((prev) => ({
          ...prev,
          analysisByItemId: {
            ...prev.analysisByItemId,
            [id]: analysis,
          },
          analysisErrorByItemId: omitKey(prev.analysisErrorByItemId, id),
          analysisLoadingItemId: prev.analysisLoadingItemId === id ? null : prev.analysisLoadingItemId,
        }));
        return analysis;
      } catch (error) {
        const message = getErrorMessage(error);
        setState((prev) => ({
          ...prev,
          analysisErrorByItemId: {
            ...prev.analysisErrorByItemId,
            [id]: message,
          },
          analysisLoadingItemId: prev.analysisLoadingItemId === id ? null : prev.analysisLoadingItemId,
        }));
        return undefined;
      }
    },
    [],
  );

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      await api.createTask(input);
      await refreshAll();
    },
    [refreshAll],
  );

  const updateTask = useCallback(
    async (id: string, input: UpdateTaskInput) => {
      await api.updateTask(id, input);
      await refreshAll();
    },
    [refreshAll],
  );

  const loadSubtasks = useCallback(async (taskId: string) => {
    const subtasks = await api.listSubtasks(taskId);
    setState((prev) => ({
      ...prev,
      subtasksByTaskId: {
        ...prev.subtasksByTaskId,
        [taskId]: subtasks,
      },
    }));

    return subtasks;
  }, []);

  const addSubtask = useCallback(
    async (taskId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) {
        return;
      }

      await api.createSubtask(taskId, {
        title: trimmed,
      });
      await loadSubtasks(taskId);
      await refreshAll();
    },
    [loadSubtasks, refreshAll],
  );

  const setSubtaskStatus = useCallback(
    async (subtaskId: string, taskId: string, status: SubtaskStatus) => {
      await api.updateSubtask(subtaskId, { status });
      await loadSubtasks(taskId);
      await refreshAll();
    },
    [loadSubtasks, refreshAll],
  );

  const panicReset = useCallback(
    async (fromDate?: string) => {
      await api.panicResetTasks(fromDate);
      await refreshAll();
    },
    [refreshAll],
  );

  const priorityTasksToday = useMemo(
    () =>
      state.tasks.filter(
        (task) => task.isPriority && task.dueDate === anchorDateKey && task.status !== "done",
      ),
    [state.tasks, anchorDateKey],
  );

  return {
    ...state,
    priorityTasksToday,
    refreshAll,
    refreshStats,
    createInboxItem,
    convertInboxItem,
    archiveInboxItem,
    createTask,
    updateTask,
    loadSubtasks,
    addSubtask,
    setSubtaskStatus,
    panicReset,
    analyzeInboxItem,
  };
}
