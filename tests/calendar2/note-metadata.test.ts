import { describe, expect, it } from "vitest";
import {
  CALENDAR2_LINKED_DATE_TAG_PREFIX,
  buildCreateNoteInput,
  toCalendar2Note,
} from "@/components/calendar2/note-metadata";
import type { Note } from "@/lib/types";

const SERVER_NOTE: Note = {
  id: "note-1",
  userId: "user-1",
  title: "Server note",
  body: "Body from api",
  tags: [`${CALENDAR2_LINKED_DATE_TAG_PREFIX}2026-03-10`, "inbox"],
  createdAt: "2026-03-10T09:00:00.000Z",
  updatedAt: "2026-03-10T09:00:00.000Z",
  children: [],
  backlinks: [],
  eventLinks: ["evt-1"],
};

describe("calendar2 note metadata", () => {
  it("maps server note into calendar2 note view model", () => {
    expect(toCalendar2Note(SERVER_NOTE)).toEqual({
      id: "note-1",
      title: "Server note",
      content: "Body from api",
      linkedDate: "2026-03-10",
      linkedEventId: "evt-1",
      createdAt: "2026-03-10T09:00:00.000Z",
      updatedAt: "2026-03-10T09:00:00.000Z",
    });
  });

  it("builds create note payload with persisted linked date metadata", () => {
    expect(
      buildCreateNoteInput({
        title: "Inbox note",
        content: "Need to remember this",
        linkedDate: "2026-03-11",
        linkedEventId: "evt-2",
      }),
    ).toEqual({
      title: "Inbox note",
      body: "Need to remember this",
      tags: [`${CALENDAR2_LINKED_DATE_TAG_PREFIX}2026-03-11`],
      eventLinks: ["evt-2"],
    });
  });
});
