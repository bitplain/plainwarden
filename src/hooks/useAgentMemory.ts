"use client";

import { useCallback, useMemo, useState } from "react";
import type { AgentMemoryItem } from "@/agent/types";

const MEMORY_STORAGE_KEY = "netden:agent:memory";

function loadFromStorage(): AgentMemoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(MEMORY_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is AgentMemoryItem => {
        return (
          typeof item === "object" &&
          item !== null &&
          typeof (item as { id?: unknown }).id === "string" &&
          typeof (item as { value?: unknown }).value === "string" &&
          typeof (item as { updatedAt?: unknown }).updatedAt === "string"
        );
      })
      .slice(0, 50);
  } catch {
    return [];
  }
}

function persist(items: AgentMemoryItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(items));
}

export function useAgentMemory() {
  const [items, setItems] = useState<AgentMemoryItem[]>(() => loadFromStorage());

  const addMemory = useCallback((value: string, pinned = false) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setItems((prev) => {
      const next: AgentMemoryItem[] = [
        {
          id: crypto.randomUUID(),
          value: trimmed,
          pinned,
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 50);
      persist(next);
      return next;
    });
  }, []);

  const updateMemory = useCallback((id: string, value: string, pinned?: boolean) => {
    setItems((prev) => {
      const next = prev.map((item) =>
        item.id === id
          ? {
              ...item,
              value,
              pinned: pinned ?? item.pinned,
              updatedAt: new Date().toISOString(),
            }
          : item,
      );
      persist(next);
      return next;
    });
  }, []);

  const removeMemory = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const clearMemory = useCallback(() => {
    setItems([]);
    persist([]);
  }, []);

  const pinnedItems = useMemo(() => items.filter((item) => item.pinned), [items]);

  return {
    items,
    pinnedItems,
    addMemory,
    updateMemory,
    removeMemory,
    clearMemory,
  };
}
