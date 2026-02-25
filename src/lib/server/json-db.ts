import { Event as PrismaEvent, Prisma, User as PrismaUser } from "@prisma/client";
import { mockEvents } from "@/lib/mock-data";
import { CalendarEvent, CreateEventInput, PersistedUser } from "@/lib/types";
import prisma from "@/lib/server/prisma";

export class DbConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DbConflictError";
  }
}

export class DbStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DbStateError";
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function toPersistedUser(user: PrismaUser): PersistedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt.toISOString(),
  };
}

function toPublicEvent(event: PrismaEvent): CalendarEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date,
    time: event.time ?? undefined,
    type: event.type,
    status: event.status,
  };
}

function sortCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
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

export async function hasUsers(): Promise<boolean> {
  const count = await prisma.user.count();
  return count > 0;
}

export async function findUserByEmail(email: string): Promise<PersistedUser | null> {
  const user = await prisma.user.findUnique({
    where: {
      email: normalizeEmail(email),
    },
  });

  return user ? toPersistedUser(user) : null;
}

export async function findUserById(userId: string): Promise<PersistedUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  return user ? toPersistedUser(user) : null;
}

export async function createUserRecord(input: {
  email: string;
  name: string;
  passwordHash: string;
  mustBeFirst?: boolean;
}): Promise<PersistedUser> {
  return prisma.$transaction(async (tx) => {
    if (input.mustBeFirst) {
      const count = await tx.user.count();
      if (count > 0) {
        throw new DbStateError("Registration is closed");
      }
    }

    try {
      const user = await tx.user.create({
        data: {
          email: normalizeEmail(input.email),
          name: input.name.trim(),
          passwordHash: input.passwordHash,
        },
      });

      return toPersistedUser(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DbConflictError("User with this email already exists");
      }
      throw error;
    }
  });
}

export async function seedEventsForUser(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existingCount = await tx.event.count({
      where: { userId },
    });

    if (existingCount > 0) {
      return;
    }

    await tx.event.createMany({
      data: mockEvents.map((event) => ({
        userId,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        type: event.type,
        status: event.status ?? "pending",
      })),
    });
  });
}

export async function listEventsByUser(userId: string): Promise<CalendarEvent[]> {
  const events = await prisma.event.findMany({
    where: { userId },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  return sortCalendarEvents(events.map(toPublicEvent));
}

export async function createEventForUser(
  userId: string,
  input: CreateEventInput,
): Promise<CalendarEvent> {
  const event = await prisma.event.create({
    data: {
      userId,
      title: input.title,
      description: input.description,
      date: input.date,
      time: input.time,
      type: input.type,
      status: input.status ?? "pending",
    },
  });

  return toPublicEvent(event);
}

export async function updateEventForUser(
  userId: string,
  eventId: string,
  input: Partial<CreateEventInput>,
): Promise<CalendarEvent | null> {
  const updateData: Prisma.EventUpdateManyMutationInput = {};

  if (input.title !== undefined) {
    updateData.title = input.title;
  }
  if (input.description !== undefined) {
    updateData.description = input.description;
  }
  if (input.type !== undefined) {
    updateData.type = input.type;
  }
  if (input.date !== undefined) {
    updateData.date = input.date;
  }
  if (input.time !== undefined) {
    updateData.time = input.time;
  }
  if (input.status !== undefined) {
    updateData.status = input.status;
  }

  const updated = await prisma.event.updateMany({
    where: {
      id: eventId,
      userId,
    },
    data: updateData,
  });

  if (updated.count === 0) {
    return null;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  return event ? toPublicEvent(event) : null;
}

export async function deleteEventForUser(userId: string, eventId: string): Promise<boolean> {
  const deleted = await prisma.event.deleteMany({
    where: {
      id: eventId,
      userId,
    },
  });

  return deleted.count > 0;
}
