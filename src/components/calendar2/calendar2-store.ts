"use client";

import { useCallback, useSyncExternalStore } from "react";
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
  currentState = updater(currentState);
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
    addNote,
    updateNote,
    deleteNote,
    addTimeBlock,
    updateTimeBlock,
    deleteTimeBlock,
  };
}
