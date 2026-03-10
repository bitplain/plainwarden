"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import type { Note as ServerNote } from "@/lib/types";
import type { Note as Calendar2Note } from "./calendar2-types";
import { buildCreateNoteInput, buildUpdateNoteInput, toCalendar2Note } from "./note-metadata";

interface Calendar2NotesState {
  loading: boolean;
  error: string | null;
  notes: Calendar2Note[];
}

interface Calendar2NotesApi {
  getNotes: () => Promise<ServerNote[]>;
  createNote: typeof api.createNote;
  updateNote: typeof api.updateNote;
  deleteNote: typeof api.deleteNote;
}

export interface Calendar2NotesStore {
  subscribe: (listener: () => void) => () => void;
  getState: () => Calendar2NotesState;
  getSnapshot: () => Calendar2NotesState;
  getServerSnapshot: () => Calendar2NotesState;
  refresh: () => Promise<void>;
  reset: () => void;
  createNote: (input: {
    title: string;
    content: string;
    linkedDate?: string;
    linkedEventId?: string;
  }) => Promise<void>;
  updateNote: (id: string, updates: { title?: string; content?: string }) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

const EMPTY_STATE: Calendar2NotesState = {
  loading: false,
  error: null,
  notes: [],
};

function sortNotes(notes: Calendar2Note[]): Calendar2Note[] {
  return [...notes].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unexpected error";
}

export function createCalendar2NotesStore(notesApi: Calendar2NotesApi): Calendar2NotesStore {
  let currentState: Calendar2NotesState = { ...EMPTY_STATE };
  const listeners = new Set<() => void>();

  const emitChange = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const setState = (updater: (prev: Calendar2NotesState) => Calendar2NotesState) => {
    const next = updater(currentState);
    if (Object.is(next, currentState)) {
      return;
    }

    currentState = next;
    emitChange();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getSnapshot() {
      return currentState;
    },

    getState() {
      return currentState;
    },

    getServerSnapshot() {
      return EMPTY_STATE;
    },

    async refresh() {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const notes = await notesApi.getNotes();
        setState(() => ({
          loading: false,
          error: null,
          notes: sortNotes(notes.map(toCalendar2Note)),
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: getErrorMessage(error),
        }));
        throw error;
      }
    },

    reset() {
      setState(() => ({ ...EMPTY_STATE }));
    },

    async createNote(input) {
      try {
        const created = await notesApi.createNote(buildCreateNoteInput(input));
        setState((prev) => ({
          ...prev,
          error: null,
          notes: sortNotes([toCalendar2Note(created), ...prev.notes]),
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: getErrorMessage(error),
        }));
        throw error;
      }
    },

    async updateNote(id, updates) {
      try {
        const updated = await notesApi.updateNote(id, buildUpdateNoteInput(updates));
        setState((prev) => ({
          ...prev,
          error: null,
          notes: sortNotes(
            prev.notes.map((note) => (note.id === id ? toCalendar2Note(updated) : note)),
          ),
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: getErrorMessage(error),
        }));
        throw error;
      }
    },

    async deleteNote(id) {
      try {
        await notesApi.deleteNote(id);
        setState((prev) => ({
          ...prev,
          error: null,
          notes: prev.notes.filter((note) => note.id !== id),
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: getErrorMessage(error),
        }));
        throw error;
      }
    },
  };
}

const calendar2NotesStore = createCalendar2NotesStore({
  getNotes: () => api.getNotes(),
  createNote: api.createNote.bind(api),
  updateNote: api.updateNote.bind(api),
  deleteNote: api.deleteNote.bind(api),
});

export function useCalendar2Notes(enabled: boolean) {
  const state = useSyncExternalStore(
    calendar2NotesStore.subscribe,
    calendar2NotesStore.getSnapshot,
    calendar2NotesStore.getServerSnapshot,
  );

  useEffect(() => {
    if (!enabled) {
      calendar2NotesStore.reset();
      return;
    }

    void calendar2NotesStore.refresh();
  }, [enabled]);

  return {
    ...state,
    refresh: calendar2NotesStore.refresh,
    createNote: calendar2NotesStore.createNote,
    updateNote: calendar2NotesStore.updateNote,
    deleteNote: calendar2NotesStore.deleteNote,
  };
}
