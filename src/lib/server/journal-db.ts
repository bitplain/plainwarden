import prisma from "@/lib/server/prisma";

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  body: string;
  date: string;
  mood?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateJournalEntryInput {
  title: string;
  body?: string;
  date: string;
  mood?: string;
  tags?: string[];
}

export interface UpdateJournalEntryInput {
  title?: string;
  body?: string;
  date?: string;
  mood?: string;
  tags?: string[];
}

export interface JournalListFilters {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  tag?: string;
}

function toPublic(entry: {
  id: string;
  userId: string;
  title: string;
  body: string;
  date: string;
  mood: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}): JournalEntry {
  return {
    id: entry.id,
    userId: entry.userId,
    title: entry.title,
    body: entry.body,
    date: entry.date,
    mood: entry.mood ?? undefined,
    tags: entry.tags,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export async function listJournalEntriesForUser(
  userId: string,
  filters: JournalListFilters = {},
): Promise<JournalEntry[]> {
  const where: Record<string, unknown> = { userId };

  if (filters.date) {
    where.date = filters.date;
  } else {
    if (filters.dateFrom || filters.dateTo) {
      const dateFilter: Record<string, string> = {};
      if (filters.dateFrom) dateFilter.gte = filters.dateFrom;
      if (filters.dateTo) dateFilter.lte = filters.dateTo;
      where.date = dateFilter;
    }
  }

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { body: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.tag) {
    where.tags = { has: filters.tag };
  }

  const entries = await prisma.journalEntry.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return entries.map(toPublic);
}

export async function getJournalEntryForUser(
  userId: string,
  entryId: string,
): Promise<JournalEntry | null> {
  const entry = await prisma.journalEntry.findFirst({
    where: { id: entryId, userId },
  });

  return entry ? toPublic(entry) : null;
}

export async function createJournalEntryForUser(
  userId: string,
  input: CreateJournalEntryInput,
): Promise<JournalEntry> {
  const entry = await prisma.journalEntry.create({
    data: {
      userId,
      title: input.title,
      body: input.body ?? "",
      date: input.date,
      mood: input.mood,
      tags: input.tags ?? [],
    },
  });

  return toPublic(entry);
}

export async function updateJournalEntryForUser(
  userId: string,
  entryId: string,
  input: UpdateJournalEntryInput,
): Promise<JournalEntry | null> {
  const existing = await prisma.journalEntry.findFirst({
    where: { id: entryId, userId },
  });

  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.body !== undefined) data.body = input.body;
  if (input.date !== undefined) data.date = input.date;
  if (input.mood !== undefined) data.mood = input.mood;
  if (input.tags !== undefined) data.tags = input.tags;

  const updated = await prisma.journalEntry.update({
    where: { id: entryId },
    data,
  });

  return toPublic(updated);
}

export async function deleteJournalEntryForUser(
  userId: string,
  entryId: string,
): Promise<boolean> {
  const existing = await prisma.journalEntry.findFirst({
    where: { id: entryId, userId },
  });

  if (!existing) return false;

  await prisma.journalEntry.delete({ where: { id: entryId } });
  return true;
}
