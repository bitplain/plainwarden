import { Note as PrismaNote, NoteVersion as PrismaVersion, Prisma } from "@prisma/client";
import prisma from "@/lib/server/prisma";
import { CreateNoteInput, Note, NoteListFilters, NoteRef, NoteVersion, UpdateNoteInput } from "@/lib/types";

function extractWikilinks(body: string): string[] {
  const titles: string[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    const title = match[1].trim();
    if (title) titles.push(title);
  }
  return [...new Set(titles)];
}

function toPublicVersion(v: PrismaVersion): NoteVersion {
  return {
    id: v.id,
    noteId: v.noteId,
    title: v.title,
    body: v.body,
    createdAt: v.createdAt.toISOString(),
  };
}

type NoteWithRelations = PrismaNote & {
  children: { id: string; title: string }[];
  inLinks: { source: { id: string; title: string } }[];
  eventLinks: { eventId: string }[];
};

function toPublicNote(note: NoteWithRelations): Note {
  return {
    id: note.id,
    userId: note.userId,
    title: note.title,
    body: note.body,
    parentId: note.parentId ?? undefined,
    tags: note.tags,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    children: note.children.map((c) => ({ id: c.id, title: c.title })),
    backlinks: note.inLinks.map((l) => ({ id: l.source.id, title: l.source.title })),
    eventLinks: note.eventLinks.map((el) => el.eventId),
  };
}

const noteInclude = {
  children: { select: { id: true, title: true } },
  inLinks: { include: { source: { select: { id: true, title: true } } } },
  eventLinks: { select: { eventId: true } },
} as const;

async function syncNoteLinks(
  tx: Prisma.TransactionClient,
  noteId: string,
  userId: string,
  body: string,
): Promise<void> {
  const titles = extractWikilinks(body);

  await tx.noteLink.deleteMany({ where: { sourceId: noteId } });

  if (titles.length === 0) return;

  const targets = await tx.note.findMany({
    where: { userId, title: { in: titles } },
    select: { id: true },
  });

  if (targets.length === 0) return;

  const unique = targets.filter((t) => t.id !== noteId);
  if (unique.length === 0) return;

  await tx.noteLink.createMany({
    data: unique.map((t) => ({ sourceId: noteId, targetId: t.id })),
    skipDuplicates: true,
  });
}

async function syncEventLinks(
  tx: Prisma.TransactionClient,
  noteId: string,
  eventIds: string[],
): Promise<void> {
  await tx.noteEventLink.deleteMany({ where: { noteId } });
  if (eventIds.length === 0) return;
  await tx.noteEventLink.createMany({
    data: eventIds.map((eventId) => ({ noteId, eventId })),
    skipDuplicates: true,
  });
}

export async function listNotesForUser(userId: string, filters: NoteListFilters = {}): Promise<Note[]> {
  const where: Prisma.NoteWhereInput = { userId };

  if (filters.q) {
    const q = filters.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { body: { contains: q, mode: "insensitive" } },
    ];
  }

  if (filters.tag) {
    where.tags = { has: filters.tag };
  }

  if (filters.parentId !== undefined) {
    where.parentId = filters.parentId === "" ? null : filters.parentId;
  }

  const notes = await prisma.note.findMany({
    where,
    include: noteInclude,
    orderBy: [{ updatedAt: "desc" }],
  });

  return notes.map(toPublicNote);
}

export async function getNoteForUser(userId: string, noteId: string): Promise<Note | null> {
  const note = await prisma.note.findFirst({
    where: { id: noteId, userId },
    include: noteInclude,
  });

  return note ? toPublicNote(note) : null;
}

export async function createNoteForUser(userId: string, input: CreateNoteInput): Promise<Note> {
  return prisma.$transaction(async (tx) => {
    const note = await tx.note.create({
      data: {
        userId,
        title: input.title,
        body: input.body ?? "",
        parentId: input.parentId ?? null,
        tags: input.tags ?? [],
      },
      include: noteInclude,
    });

    await syncNoteLinks(tx, note.id, userId, note.body);

    if (input.eventLinks && input.eventLinks.length > 0) {
      await syncEventLinks(tx, note.id, input.eventLinks);
    }

    // Create initial version snapshot
    await tx.noteVersion.create({
      data: {
        noteId: note.id,
        title: note.title,
        body: note.body,
      },
    });

    // Re-fetch with updated relations
    const fresh = await tx.note.findUniqueOrThrow({
      where: { id: note.id },
      include: noteInclude,
    });

    return toPublicNote(fresh);
  });
}

export async function updateNoteForUser(
  userId: string,
  noteId: string,
  input: UpdateNoteInput,
): Promise<Note | null> {
  const existing = await prisma.note.findFirst({ where: { id: noteId, userId } });
  if (!existing) return null;

  return prisma.$transaction(async (tx) => {
    const updateData: Prisma.NoteUncheckedUpdateInput = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.body !== undefined) updateData.body = input.body;
    if ("parentId" in input) updateData.parentId = input.parentId ?? null;
    if (input.tags !== undefined) updateData.tags = input.tags;

    const updated = await tx.note.update({
      where: { id: noteId },
      data: updateData,
      include: noteInclude,
    });

    // Sync wikilinks if body changed
    if (input.body !== undefined) {
      await syncNoteLinks(tx, noteId, userId, updated.body);
    }

    // Sync event links if provided
    if (input.eventLinks !== undefined) {
      await syncEventLinks(tx, noteId, input.eventLinks);
    }

    // Save version snapshot on each update
    await tx.noteVersion.create({
      data: {
        noteId,
        title: updated.title,
        body: updated.body,
      },
    });

    const fresh = await tx.note.findUniqueOrThrow({
      where: { id: noteId },
      include: noteInclude,
    });

    return toPublicNote(fresh);
  });
}

export async function deleteNoteForUser(userId: string, noteId: string): Promise<boolean> {
  const deleted = await prisma.note.deleteMany({ where: { id: noteId, userId } });
  return deleted.count > 0;
}

export async function getNoteVersions(userId: string, noteId: string): Promise<NoteVersion[]> {
  const note = await prisma.note.findFirst({ where: { id: noteId, userId }, select: { id: true } });
  if (!note) return [];

  const versions = await prisma.noteVersion.findMany({
    where: { noteId },
    orderBy: { createdAt: "desc" },
  });

  return versions.map(toPublicVersion);
}

export async function restoreNoteVersion(
  userId: string,
  noteId: string,
  versionId: string,
): Promise<Note | null> {
  const version = await prisma.noteVersion.findFirst({
    where: { id: versionId, noteId, note: { userId } },
  });

  if (!version) return null;

  return updateNoteForUser(userId, noteId, { title: version.title, body: version.body });
}

export async function exportNoteAsMarkdown(userId: string, noteId: string): Promise<string | null> {
  const note = await prisma.note.findFirst({
    where: { id: noteId, userId },
    include: noteInclude,
  });

  if (!note) return null;

  const pub = toPublicNote(note);

  const tagLine =
    pub.tags.length > 0
      ? `tags: [${pub.tags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(", ")}]`
      : "";
  const parentLine = pub.parentId ? `parent: ${pub.parentId}` : "";

  const frontmatterLines = [
    "---",
    `title: "${pub.title}"`,
    tagLine,
    parentLine,
    `created: ${pub.createdAt}`,
    `updated: ${pub.updatedAt}`,
    "---",
  ].filter(Boolean);

  const backlinksSection =
    pub.backlinks && pub.backlinks.length > 0
      ? `\n\n---\n## Backlinks\n${pub.backlinks.map((b: NoteRef) => `- [[${b.title}]]`).join("\n")}`
      : "";

  return `${frontmatterLines.join("\n")}\n\n${pub.body}${backlinksSection}\n`;
}
