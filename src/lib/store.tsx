"use client";

import { ReactNode, createContext, useContext, useState } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { api } from "@/lib/api";
import {
  AuthUser,
  CalendarEvent,
  CreateEventInput,
  LoginInput,
  RegisterInput,
  UpdateEventInput,
} from "@/lib/types";

interface NetdenState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  hasCheckedAuth: boolean;
  events: CalendarEvent[];
  isEventsLoading: boolean;
  error: string | null;

  bootstrapAuth: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;

  fetchEvents: () => Promise<void>;
  addEvent: (input: CreateEventInput) => Promise<void>;
  updateEvent: (input: UpdateEventInput) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  clearError: () => void;
}

function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const dateDiff = a.date.localeCompare(b.date);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    const timeA = a.time ?? "99:99";
    const timeB = b.time ?? "99:99";
    return timeA.localeCompare(timeB);
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unexpected error";
}

export const createNetdenStore = () =>
  createStore<NetdenState>()((set, get) => ({
    user: null,
    isAuthenticated: false,
    isAuthLoading: false,
    hasCheckedAuth: false,
    events: [],
    isEventsLoading: false,
    error: null,

    clearError: () => set({ error: null }),

    bootstrapAuth: async () => {
      set({ isAuthLoading: true, error: null });
      try {
        const response = await api.me();
        set({
          user: response.user,
          isAuthenticated: true,
          hasCheckedAuth: true,
          isAuthLoading: false,
        });
      } catch {
        set({
          user: null,
          isAuthenticated: false,
          hasCheckedAuth: true,
          isAuthLoading: false,
          events: [],
        });
      }
    },

    login: async (input) => {
      set({ isAuthLoading: true, error: null });
      try {
        const response = await api.login(input);
        set({
          user: response.user,
          isAuthenticated: true,
          hasCheckedAuth: true,
          isAuthLoading: false,
        });
        await get().fetchEvents();
      } catch (error) {
        set({
          user: null,
          isAuthenticated: false,
          isAuthLoading: false,
          error: getErrorMessage(error),
        });
        throw error;
      }
    },

    register: async (input) => {
      set({ isAuthLoading: true, error: null });
      try {
        await api.register(input);
        await get().login({ email: input.email, password: input.password });
      } catch (error) {
        set({ isAuthLoading: false, error: getErrorMessage(error) });
        throw error;
      }
    },

    logout: async () => {
      set({ isAuthLoading: true, error: null });
      try {
        await api.logout();
      } finally {
        set({
          user: null,
          isAuthenticated: false,
          isAuthLoading: false,
          hasCheckedAuth: true,
          events: [],
        });
      }
    },

    fetchEvents: async () => {
      if (!get().isAuthenticated) {
        set({ events: [] });
        return;
      }

      set({ isEventsLoading: true, error: null });
      try {
        const events = await api.getEvents();
        set({ events: sortEvents(events), isEventsLoading: false });
      } catch (error) {
        set({ isEventsLoading: false, error: getErrorMessage(error) });
        throw error;
      }
    },

    addEvent: async (input) => {
      set({ error: null });
      try {
        const created = await api.createEvent(input);
        set((state) => ({ events: sortEvents([...state.events, created]) }));
      } catch (error) {
        set({ error: getErrorMessage(error) });
        throw error;
      }
    },

    updateEvent: async (input) => {
      set({ error: null });
      try {
        const updated = await api.updateEvent(input);
        set((state) => ({
          events: sortEvents(
            state.events.map((event) => (event.id === updated.id ? updated : event)),
          ),
        }));
      } catch (error) {
        set({ error: getErrorMessage(error) });
        throw error;
      }
    },

    deleteEvent: async (id) => {
      set({ error: null });
      try {
        await api.deleteEvent(id);
        set((state) => ({ events: state.events.filter((event) => event.id !== id) }));
      } catch (error) {
        set({ error: getErrorMessage(error) });
        throw error;
      }
    },
  }));

export type NetdenStoreApi = ReturnType<typeof createNetdenStore>;

const NetdenStoreContext = createContext<NetdenStoreApi | null>(null);

export function NetdenStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState<NetdenStoreApi>(() => createNetdenStore());

  return (
    <NetdenStoreContext.Provider value={store}>
      {children}
    </NetdenStoreContext.Provider>
  );
}

export function useNetdenStore<T>(selector: (state: NetdenState) => T): T {
  const store = useContext(NetdenStoreContext);

  if (!store) {
    throw new Error("useNetdenStore must be used inside NetdenStoreProvider");
  }

  return useStore(store, selector);
}
