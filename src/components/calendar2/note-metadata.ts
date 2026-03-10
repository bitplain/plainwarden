"use client";

import type { CreateNoteInput, Note as ServerNote, UpdateNoteInput } from "@/lib/types";
import type { Note as Calendar2Note } from "./calendar2-types";

export const CALENDAR2_LINKED_DATE_TAG_PREFIX = "calendar2:date:";
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function extractLinkedDate(tags: string[]): string | undefined {
  const raw = tags.find((tag) => tag.startsWith(CALENDAR2_LINKED_DATE_TAG_PREFIX));
  if (!raw) {
    return undefined;
  }

  const value = raw.slice(CALENDAR2_LINKED_DATE_TAG_PREFIX.length).trim();
  return ISO_DATE_REGEX.test(value) ? value : undefined;
}

export function toCalendar2Note(note: ServerNote): Calendar2Note {
  return {
    id: note.id,
    title: note.title,
    content: note.body,
    linkedDate: extractLinkedDate(note.tags),
    linkedEventId: note.eventLinks?.[0],
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

export function buildCreateNoteInput(input: {
  title: string;
  content: string;
  linkedDate?: string;
  linkedEventId?: string;
}): CreateNoteInput {
  const payload: CreateNoteInput = {
    title: input.title,
    body: input.content,
  };

  if (input.linkedDate && ISO_DATE_REGEX.test(input.linkedDate)) {
    payload.tags = [`${CALENDAR2_LINKED_DATE_TAG_PREFIX}${input.linkedDate}`];
  }

  if (input.linkedEventId) {
    payload.eventLinks = [input.linkedEventId];
  }

  return payload;
}

export function buildUpdateNoteInput(input: {
  title?: string;
  content?: string;
}): UpdateNoteInput {
  const payload: UpdateNoteInput = {};

  if (input.title !== undefined) {
    payload.title = input.title;
  }
  if (input.content !== undefined) {
    payload.body = input.content;
  }

  return payload;
}
