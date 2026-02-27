"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { CalendarEvent } from "@/lib/types";
import type { KanbanCard, KanbanColumn, Note, TaskPriority, TimeBlock } from "./calendar2-types";

interface Calendar2LocalState {
  kanbanCards: KanbanCard[];
  notes: Note[];
  timeBlocks: TimeBlock[];
}

const STORAGE_KEY = "calendar2-local-state";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

interface SyncTaskEventsToKanbanCardsInput {
  cards: KanbanCard[];
  events: CalendarEvent[];
  priorities: Record<string, TaskPriority>;
  removeStaleSyncedCards?: boolean;
  now?: string;
}

function getSyncedTaskColumn(event: CalendarEvent): KanbanColumn {
  return (event.status ?? "pending") === "done" ? "done" : "backlog";
}

export function syncTaskEventsToKanbanCards(
  input: SyncTaskEventsToKanbanCardsInput,
): KanbanCard[] {
  const shouldRemoveStaleSyncedCards = input.removeStaleSyncedCards ?? true;
  const taskEvents = input.events.filter((event) => event.type === "task");
  const taskEventsById = new Map(taskEvents.map((event) => [event.id, event]));
  const cardsByEventId = new Map<string, number>();
  const dedupedCards: KanbanCard[] = [];
  const createdAt = input.now ?? nowISO();
  let hasChanges = false;

  for (const card of input.cards) {
    if (!card.linkedEventId) {
      dedupedCards.push(card);
      continue;
    }

    const linkedTaskEvent = taskEventsById.get(card.linkedEventId);
    if (!linkedTaskEvent) {
      if (card.source === "event_sync" && shouldRemoveStaleSyncedCards) {
        hasChanges = true;
        continue;
      }
      dedupedCards.push(card);
      continue;
    }

    const existingIndex = cardsByEventId.get(card.linkedEventId);
    if (existingIndex === undefined) {
      cardsByEventId.set(card.linkedEventId, dedupedCards.length);
      dedupedCards.push(card);
      continue;
    }

    const existingCard = dedupedCards[existingIndex];
    if (existingCard.source === "event_sync" && card.source !== "event_sync") {
      dedupedCards[existingIndex] = card;
    }
    hasChanges = true;
  }

  for (const taskEvent of taskEvents) {
    const existingIndex = cardsByEventId.get(taskEvent.id);
    const mappedPriority = input.priorities[taskEvent.id];

    if (existingIndex === undefined) {
      dedupedCards.push({
        id: generateId(),
        title: taskEvent.title,
        description: taskEvent.description,
        column: getSyncedTaskColumn(taskEvent),
        priority: mappedPriority ?? "medium",
        linkedEventId: taskEvent.id,
        source: "event_sync",
        createdAt,
      });
      hasChanges = true;
      continue;
    }

    const existingCard = dedupedCards[existingIndex];
    const nextCard: KanbanCard = {
      ...existingCard,
      title: taskEvent.title,
      description: taskEvent.description,
      priority: mappedPriority ?? existingCard.priority,
      linkedEventId: taskEvent.id,
      column:
        (taskEvent.status ?? "pending") === "done"
          ? "done"
          : existingCard.column,
    };

    if (
      nextCard.title !== existingCard.title ||
      nextCard.description !== existingCard.description ||
      nextCard.priority !== existingCard.priority ||
      nextCard.column !== existingCard.column ||
      nextCard.linkedEventId !== existingCard.linkedEventId ||
      nextCard.source !== existingCard.source
    ) {
      dedupedCards[existingIndex] = nextCard;
      hasChanges = true;
    }
  }

  return hasChanges ? dedupedCards : input.cards;
}

function isValidState(data: unknown): data is Calendar2LocalState {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    Array.isArray(obj.kanbanCards) &&
    Array.isArray(obj.notes) &&
    Array.isArray(obj.timeBlocks)
  );
}

function loadState(): Calendar2LocalState {
  if (typeof window === "undefined") {
    return { kanbanCards: [], notes: [], timeBlocks: [] };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValidState(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }

  return { kanbanCards: [], notes: [], timeBlocks: [] };
}

function saveState(state: Calendar2LocalState): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

let currentState = loadState();
const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setState(updater: (prev: Calendar2LocalState) => Calendar2LocalState): void {
  const nextState = updater(currentState);
  if (Object.is(nextState, currentState)) {
    return;
  }
  currentState = nextState;
  saveState(currentState);
  emitChange();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Calendar2LocalState {
  return currentState;
}

function getServerSnapshot(): Calendar2LocalState {
  return { kanbanCards: [], notes: [], timeBlocks: [] };
}

export function useCalendar2Store() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addKanbanCard = useCallback(
    (input: { title: string; description: string; column: KanbanColumn; priority: TaskPriority; linkedEventId?: string }) => {
      const card: KanbanCard = {
        id: generateId(),
        ...input,
        source: "manual",
        createdAt: nowISO(),
      };
      setState((prev) => ({ ...prev, kanbanCards: [...prev.kanbanCards, card] }));
      return card;
    },
    [],
  );

  const updateKanbanCard = useCallback((id: string, updates: Partial<Omit<KanbanCard, "id" | "createdAt">>) => {
    setState((prev) => ({
      ...prev,
      kanbanCards: prev.kanbanCards.map((card) => (card.id === id ? { ...card, ...updates } : card)),
    }));
  }, []);

  const deleteKanbanCard = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      kanbanCards: prev.kanbanCards.filter((card) => card.id !== id),
    }));
  }, []);

  const moveKanbanCard = useCallback((id: string, column: KanbanColumn) => {
    setState((prev) => ({
      ...prev,
      kanbanCards: prev.kanbanCards.map((card) => (card.id === id ? { ...card, column } : card)),
    }));
  }, []);

  const syncTaskEventsToKanban = useCallback(
    (
      events: CalendarEvent[],
      priorities: Record<string, TaskPriority>,
      options?: { removeStaleSyncedCards?: boolean },
    ) => {
      setState((prev) => {
        const nextCards = syncTaskEventsToKanbanCards({
          cards: prev.kanbanCards,
          events,
          priorities,
          removeStaleSyncedCards: options?.removeStaleSyncedCards,
        });
        if (nextCards === prev.kanbanCards) {
          return prev;
        }
        return { ...prev, kanbanCards: nextCards };
      });
    },
    [],
  );

  const addNote = useCallback(
    (input: { title: string; content: string; linkedDate?: string; linkedEventId?: string }) => {
      const note: Note = {
        id: generateId(),
        ...input,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      setState((prev) => ({ ...prev, notes: [...prev.notes, note] }));
      return note;
    },
    [],
  );

  const updateNote = useCallback((id: string, updates: Partial<Omit<Note, "id" | "createdAt">>) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((note) =>
        note.id === id ? { ...note, ...updates, updatedAt: nowISO() } : note,
      ),
    }));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.filter((note) => note.id !== id),
    }));
  }, []);

  const addTimeBlock = useCallback(
    (input: Omit<TimeBlock, "id">) => {
      const block: TimeBlock = { id: generateId(), ...input };
      setState((prev) => ({ ...prev, timeBlocks: [...prev.timeBlocks, block] }));
      return block;
    },
    [],
  );

  const updateTimeBlock = useCallback((id: string, updates: Partial<Omit<TimeBlock, "id">>) => {
    setState((prev) => ({
      ...prev,
      timeBlocks: prev.timeBlocks.map((block) => (block.id === id ? { ...block, ...updates } : block)),
    }));
  }, []);

  const deleteTimeBlock = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      timeBlocks: prev.timeBlocks.filter((block) => block.id !== id),
    }));
  }, []);

  return {
    kanbanCards: state.kanbanCards,
    notes: state.notes,
    timeBlocks: state.timeBlocks,
    addKanbanCard,
    updateKanbanCard,
    deleteKanbanCard,
    moveKanbanCard,
    syncTaskEventsToKanban,
    addNote,
    updateNote,
    deleteNote,
    addTimeBlock,
    updateTimeBlock,
    deleteTimeBlock,
  };
}
