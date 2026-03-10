import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCalendar2NotesStore } from "@/components/calendar2/notes-store";
import { CALENDAR2_LINKED_DATE_TAG_PREFIX } from "@/components/calendar2/note-metadata";
import type { Note } from "@/lib/types";

const API_NOTE: Note = {
  id: "note-1",
  userId: "user-1",
  title: "API note",
  body: "Persisted body",
  tags: [`${CALENDAR2_LINKED_DATE_TAG_PREFIX}2026-03-10`, "inbox"],
  createdAt: "2026-03-10T09:00:00.000Z",
  updatedAt: "2026-03-10T09:00:00.000Z",
  children: [],
  backlinks: [],
  eventLinks: ["evt-1"],
};

describe("calendar2 notes store", () => {
  const api = {
    getNotes: vi.fn<() => Promise<Note[]>>(),
    createNote: vi.fn<(input: unknown) => Promise<Note>>(),
    updateNote: vi.fn<(id: string, input: unknown) => Promise<Note>>(),
    deleteNote: vi.fn<(id: string) => Promise<void>>(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates notes from the authoritative API", async () => {
    api.getNotes.mockResolvedValue([API_NOTE]);
    const store = createCalendar2NotesStore(api);

    await store.refresh();

    expect(api.getNotes).toHaveBeenCalledOnce();
    expect(store.getState()).toMatchObject({
      loading: false,
      error: null,
      notes: [
        {
          id: "note-1",
          title: "API note",
          content: "Persisted body",
          linkedDate: "2026-03-10",
          linkedEventId: "evt-1",
        },
      ],
    });
  });

  it("creates notes through the API and syncs the returned server state", async () => {
    api.createNote.mockResolvedValue({
      ...API_NOTE,
      id: "note-2",
      title: "Inbox note",
      body: "Need to remember this",
      tags: [`${CALENDAR2_LINKED_DATE_TAG_PREFIX}2026-03-11`],
      eventLinks: ["evt-2"],
    });
    const store = createCalendar2NotesStore(api);

    await store.createNote({
      title: "Inbox note",
      content: "Need to remember this",
      linkedDate: "2026-03-11",
      linkedEventId: "evt-2",
    });

    expect(api.createNote).toHaveBeenCalledWith({
      title: "Inbox note",
      body: "Need to remember this",
      tags: [`${CALENDAR2_LINKED_DATE_TAG_PREFIX}2026-03-11`],
      eventLinks: ["evt-2"],
    });
    expect(store.getState().notes).toEqual([
      {
        id: "note-2",
        title: "Inbox note",
        content: "Need to remember this",
        linkedDate: "2026-03-11",
        linkedEventId: "evt-2",
        createdAt: "2026-03-10T09:00:00.000Z",
        updatedAt: "2026-03-10T09:00:00.000Z",
      },
    ]);
  });
});
