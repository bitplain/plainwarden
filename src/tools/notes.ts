import type { AgentToolDescriptor, ToolExecutionContext, ToolResult } from "@/agent/types";
import { createNoteForUser, deleteNoteForUser, listNotesForUser, updateNoteForUser } from "@/lib/server/notes-db";

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

async function listNotes(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  const notes = await listNotesForUser(ctx.userId, {
    q: toStringValue(args.q),
    tag: toStringValue(args.tag),
    parentId: toStringValue(args.parentId),
  });

  return {
    ok: true,
    data: notes.slice(0, 100),
  };
}

async function createNote(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  const title = toStringValue(args.title);
  if (!title) {
    return { ok: false, error: "title is required" };
  }

  const note = await createNoteForUser(ctx.userId, {
    title,
    body: toStringValue(args.body) ?? "",
    parentId: toStringValue(args.parentId),
    tags: toStringArray(args.tags) ?? [],
    eventLinks: toStringArray(args.eventLinks) ?? [],
  });

  return {
    ok: true,
    data: note,
  };
}

async function updateNote(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  const noteId = toStringValue(args.noteId);
  if (!noteId) {
    return { ok: false, error: "noteId is required" };
  }

  const note = await updateNoteForUser(ctx.userId, noteId, {
    title: toStringValue(args.title),
    body: toStringValue(args.body),
    parentId: args.parentId === null ? null : toStringValue(args.parentId),
    tags: toStringArray(args.tags),
    eventLinks: toStringArray(args.eventLinks),
  });

  if (!note) {
    return { ok: false, error: "note not found" };
  }

  return {
    ok: true,
    data: note,
  };
}

async function deleteNote(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  const noteId = toStringValue(args.noteId);
  if (!noteId) {
    return { ok: false, error: "noteId is required" };
  }

  const deleted = await deleteNoteForUser(ctx.userId, noteId);
  return {
    ok: deleted,
    data: { deleted },
    error: deleted ? undefined : "note not found",
  };
}

export const notesTools: AgentToolDescriptor[] = [
  {
    name: "notes_search",
    module: "notes",
    mutating: false,
    description: "Search notes by text, tag, or parent",
    parameters: {
      type: "object",
      properties: {
        q: { type: "string" },
        tag: { type: "string" },
        parentId: { type: "string" },
      },
    },
    execute: listNotes,
  },
  {
    name: "notes_create",
    module: "notes",
    mutating: true,
    description: "Create note with content and tags",
    parameters: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        parentId: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        eventLinks: { type: "array", items: { type: "string" } },
      },
    },
    execute: createNote,
  },
  {
    name: "notes_update",
    module: "notes",
    mutating: true,
    description: "Update note fields",
    parameters: {
      type: "object",
      required: ["noteId"],
      properties: {
        noteId: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
        parentId: { type: ["string", "null"] },
        tags: { type: "array", items: { type: "string" } },
        eventLinks: { type: "array", items: { type: "string" } },
      },
    },
    execute: updateNote,
  },
  {
    name: "notes_delete",
    module: "notes",
    mutating: true,
    description: "Delete note by id",
    parameters: {
      type: "object",
      required: ["noteId"],
      properties: {
        noteId: { type: "string" },
      },
    },
    execute: deleteNote,
  },
];
