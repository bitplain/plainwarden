import type { AgentToolDescriptor, ToolExecutionContext, ToolResult } from "@/agent/types";
import {
  createJournalEntryForUser,
  deleteJournalEntryForUser,
  getJournalEntryForUser,
  listJournalEntriesForUser,
  updateJournalEntryForUser,
} from "@/lib/server/journal-db";

function toStringValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function listJournalEntries(
  args: Record<string, unknown>,
  ctx: ToolExecutionContext,
): Promise<ToolResult> {
  const entries = await listJournalEntriesForUser(ctx.userId, {
    date: toStringValue(args.date),
    dateFrom: toStringValue(args.dateFrom),
    dateTo: toStringValue(args.dateTo),
    q: toStringValue(args.q),
    tag: toStringValue(args.tag),
  });

  return {
    ok: true,
    data: entries.slice(0, 100),
  };
}

async function getJournalEntry(
  args: Record<string, unknown>,
  ctx: ToolExecutionContext,
): Promise<ToolResult> {
  const entryId = toStringValue(args.entryId);
  if (!entryId) {
    return { ok: false, error: "entryId is required" };
  }

  const entry = await getJournalEntryForUser(ctx.userId, entryId);
  if (!entry) {
    return { ok: false, error: "journal entry not found" };
  }

  return { ok: true, data: entry };
}

async function createJournalEntry(
  args: Record<string, unknown>,
  ctx: ToolExecutionContext,
): Promise<ToolResult> {
  const title = toStringValue(args.title);
  const date = toStringValue(args.date);

  if (!title || !date) {
    return { ok: false, error: "title and date are required" };
  }

  const entry = await createJournalEntryForUser(ctx.userId, {
    title,
    body: toStringValue(args.body) ?? "",
    date,
    mood: toStringValue(args.mood),
    tags: toStringArray(args.tags) ?? [],
  });

  return { ok: true, data: entry };
}

async function updateJournalEntry(
  args: Record<string, unknown>,
  ctx: ToolExecutionContext,
): Promise<ToolResult> {
  const entryId = toStringValue(args.entryId);
  if (!entryId) {
    return { ok: false, error: "entryId is required" };
  }

  const entry = await updateJournalEntryForUser(ctx.userId, entryId, {
    title: toStringValue(args.title),
    body: toStringValue(args.body),
    date: toStringValue(args.date),
    mood: toStringValue(args.mood),
    tags: toStringArray(args.tags),
  });

  if (!entry) {
    return { ok: false, error: "journal entry not found" };
  }

  return { ok: true, data: entry };
}

async function deleteJournalEntry(
  args: Record<string, unknown>,
  ctx: ToolExecutionContext,
): Promise<ToolResult> {
  const entryId = toStringValue(args.entryId);
  if (!entryId) {
    return { ok: false, error: "entryId is required" };
  }

  const deleted = await deleteJournalEntryForUser(ctx.userId, entryId);
  return {
    ok: deleted,
    data: { deleted },
    error: deleted ? undefined : "journal entry not found",
  };
}

export const journalTools: AgentToolDescriptor[] = [
  {
    name: "journal_list",
    module: "daily",
    mutating: false,
    description: "List journal/log entries with optional date and text filters",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Exact date YYYY-MM-DD" },
        dateFrom: { type: "string" },
        dateTo: { type: "string" },
        q: { type: "string" },
        tag: { type: "string" },
      },
    },
    execute: listJournalEntries,
  },
  {
    name: "journal_get",
    module: "daily",
    mutating: false,
    description: "Get a single journal entry by id",
    parameters: {
      type: "object",
      required: ["entryId"],
      properties: {
        entryId: { type: "string" },
      },
    },
    execute: getJournalEntry,
  },
  {
    name: "journal_create",
    module: "daily",
    mutating: true,
    description: "Create a journal/log entry for a given date",
    parameters: {
      type: "object",
      required: ["title", "date"],
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        date: { type: "string", description: "Date YYYY-MM-DD" },
        mood: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
    },
    execute: createJournalEntry,
  },
  {
    name: "journal_update",
    module: "daily",
    mutating: true,
    description: "Update a journal entry",
    parameters: {
      type: "object",
      required: ["entryId"],
      properties: {
        entryId: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
        date: { type: "string" },
        mood: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
    },
    execute: updateJournalEntry,
  },
  {
    name: "journal_delete",
    module: "daily",
    mutating: true,
    description: "Delete a journal entry by id",
    parameters: {
      type: "object",
      required: ["entryId"],
      properties: {
        entryId: { type: "string" },
      },
    },
    execute: deleteJournalEntry,
  },
];
