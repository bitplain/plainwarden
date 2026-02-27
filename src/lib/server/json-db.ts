import {
  Event as PrismaEvent,
  EventSeries as PrismaEventSeries,
  Prisma,
  User as PrismaUser,
} from "@prisma/client";
import { mockEvents } from "@/lib/mock-data";
import {
  CalendarEvent,
  CreateEventInput,
  EventListFilters,
  EventRecurrence,
  PersistedUser,
  RecurrenceScope,
} from "@/lib/types";
import { buildEventListWhereInput } from "@/lib/server/event-filters";
import prisma from "@/lib/server/prisma";
import { dayBeforeDate, generateRecurrenceDates } from "@/lib/server/recurrence";

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

type EventWithSeries = Prisma.EventGetPayload<{
  include: { recurrenceSeries: true };
}>;

interface SeriesDefaults {
  title: string;
  description: string;
  time: string | null;
  type: PrismaEventSeries["type"];
  status: PrismaEventSeries["status"];
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

function recurrenceFromSeries(series: PrismaEventSeries | null | undefined): EventRecurrence | undefined {
  if (!series) {
    return undefined;
  }

  return {
    frequency: series.recurrenceFrequency as EventRecurrence["frequency"],
    interval: series.recurrenceInterval,
    count: series.recurrenceCount ?? undefined,
    until: series.recurrenceUntil ?? undefined,
  };
}

function toPublicEvent(event: PrismaEvent | EventWithSeries): CalendarEvent {
  const series = "recurrenceSeries" in event ? event.recurrenceSeries : null;

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date,
    time: event.time ?? undefined,
    type: event.type,
    status: event.status,
    recurrenceSeriesId: event.recurrenceSeriesId ?? undefined,
    recurrenceException: event.recurrenceException,
    recurrence: recurrenceFromSeries(series),
  };
}

function mergeSeriesDefaults(
  series: PrismaEventSeries,
  input: Partial<CreateEventInput>,
): SeriesDefaults {
  return {
    title: input.title ?? series.title,
    description: input.description ?? series.description,
    time: input.time !== undefined ? input.time ?? null : series.time,
    type: input.type ?? series.type,
    status: input.status ?? series.status,
  };
}

function buildEventUpdateData(input: Partial<CreateEventInput>): Prisma.EventUpdateInput {
  const updateData: Prisma.EventUpdateInput = {};

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

  return updateData;
}

function buildEventUpdateManyData(input: Partial<CreateEventInput>): Prisma.EventUpdateManyMutationInput {
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
  if (input.time !== undefined) {
    updateData.time = input.time;
  }
  if (input.status !== undefined) {
    updateData.status = input.status;
  }

  return updateData;
}

function buildSeriesUpdateData(
  input: Partial<CreateEventInput>,
  recurrence?: EventRecurrence,
): Prisma.EventSeriesUpdateInput {
  const data: Prisma.EventSeriesUpdateInput = {};

  if (input.title !== undefined) {
    data.title = input.title;
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.type !== undefined) {
    data.type = input.type;
  }
  if (input.time !== undefined) {
    data.time = input.time;
  }
  if (input.status !== undefined) {
    data.status = input.status;
  }

  if (recurrence) {
    data.recurrenceFrequency = recurrence.frequency;
    data.recurrenceInterval = recurrence.interval;
    data.recurrenceCount = recurrence.count ?? null;
    data.recurrenceUntil = recurrence.until ?? null;
  }

  return data;
}

function assertRecurrenceStartDate(recurrence: EventRecurrence, startDate: string) {
  if (recurrence.until && recurrence.until < startDate) {
    throw new DbStateError("recurrence.until must be on or after recurrence start date");
  }
}

function hasFieldsToUpdate(data: Prisma.EventUpdateManyMutationInput): boolean {
  return Object.keys(data).length > 0;
}

async function createSeriesEvents(
  tx: Prisma.TransactionClient,
  userId: string,
  recurrenceSeriesId: string,
  defaults: SeriesDefaults,
  dates: string[],
): Promise<void> {
  if (dates.length === 0) {
    return;
  }

  await tx.event.createMany({
    data: dates.map((date) => ({
      userId,
      title: defaults.title,
      description: defaults.description,
      date,
      time: defaults.time,
      type: defaults.type,
      status: defaults.status,
      recurrenceSeriesId,
      recurrenceException: false,
    })),
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

export async function listEventsByUser(
  userId: string,
  filters: EventListFilters = {},
): Promise<CalendarEvent[]> {
  const events = await prisma.event.findMany({
    where: buildEventListWhereInput(userId, filters),
    include: {
      recurrenceSeries: true,
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  return events.map(toPublicEvent);
}

export async function createEventForUser(
  userId: string,
  input: CreateEventInput,
): Promise<CalendarEvent> {
  if (input.recurrence) {
    const recurrence = input.recurrence;
    assertRecurrenceStartDate(recurrence, input.date);

    return prisma.$transaction(async (tx) => {
      const series = await tx.eventSeries.create({
        data: {
          userId,
          title: input.title,
          description: input.description,
          time: input.time,
          type: input.type,
          status: input.status ?? "pending",
          startDate: input.date,
          recurrenceFrequency: recurrence.frequency,
          recurrenceInterval: recurrence.interval,
          recurrenceCount: recurrence.count ?? null,
          recurrenceUntil: recurrence.until ?? null,
        },
      });

      const recurrenceDates = generateRecurrenceDates(input.date, recurrence);
      await createSeriesEvents(
        tx,
        userId,
        series.id,
        {
          title: series.title,
          description: series.description,
          time: series.time,
          type: series.type,
          status: series.status,
        },
        recurrenceDates,
      );

      const firstEvent = await tx.event.findFirst({
        where: {
          userId,
          recurrenceSeriesId: series.id,
        },
        include: {
          recurrenceSeries: true,
        },
        orderBy: [{ date: "asc" }, { time: "asc" }],
      });

      if (!firstEvent) {
        throw new DbStateError("Failed to create recurring event series");
      }

      return toPublicEvent(firstEvent);
    });
  }

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
  options: { scope?: RecurrenceScope } = {},
): Promise<CalendarEvent | null> {
  const sourceEvent = await prisma.event.findFirst({
    where: {
      id: eventId,
      userId,
    },
    include: {
      recurrenceSeries: true,
    },
  });

  if (!sourceEvent) {
    return null;
  }

  const scope = options.scope ?? "this";
  const hasSeries = Boolean(sourceEvent.recurrenceSeriesId && sourceEvent.recurrenceSeries);

  if (hasSeries && scope !== "this") {
    if (input.date !== undefined) {
      throw new DbStateError("Date updates for recurring series are only allowed with scope 'this'");
    }

    const sourceSeries = sourceEvent.recurrenceSeries!;

    if (scope === "all") {
      return prisma.$transaction(async (tx) => {
        const recurrence = input.recurrence;

        if (recurrence) {
          assertRecurrenceStartDate(recurrence, sourceSeries.startDate);

          const nextSeries = await tx.eventSeries.update({
            where: { id: sourceSeries.id, userId },
            data: buildSeriesUpdateData(input, recurrence),
          });

          await tx.event.deleteMany({
            where: {
              userId,
              recurrenceSeriesId: sourceSeries.id,
            },
          });

          const nextDates = generateRecurrenceDates(nextSeries.startDate, recurrenceFromSeries(nextSeries)!);
          await createSeriesEvents(
            tx,
            userId,
            nextSeries.id,
            {
              title: nextSeries.title,
              description: nextSeries.description,
              time: nextSeries.time,
              type: nextSeries.type,
              status: nextSeries.status,
            },
            nextDates,
          );

          const eventAtSourceDate = await tx.event.findFirst({
            where: {
              userId,
              recurrenceSeriesId: sourceSeries.id,
              date: sourceEvent.date,
            },
            include: {
              recurrenceSeries: true,
            },
            orderBy: [{ date: "asc" }, { time: "asc" }],
          });

          const fallbackEvent =
            eventAtSourceDate ??
            (await tx.event.findFirst({
              where: {
                userId,
                recurrenceSeriesId: sourceSeries.id,
              },
              include: {
                recurrenceSeries: true,
              },
              orderBy: [{ date: "asc" }, { time: "asc" }],
            }));

          if (!fallbackEvent) {
            throw new DbStateError("Recurring series update produced no events");
          }

          return toPublicEvent(fallbackEvent);
        }

        const seriesUpdateData = buildSeriesUpdateData(input);
        if (Object.keys(seriesUpdateData).length > 0) {
          await tx.eventSeries.update({
            where: { id: sourceSeries.id, userId },
            data: seriesUpdateData,
          });
        }

        const eventUpdateManyData = buildEventUpdateManyData(input);
        if (hasFieldsToUpdate(eventUpdateManyData)) {
          await tx.event.updateMany({
            where: {
              userId,
              recurrenceSeriesId: sourceSeries.id,
              recurrenceException: false,
            },
            data: eventUpdateManyData,
          });
        }

        const event = await tx.event.findFirst({
          where: { id: eventId, userId },
          include: {
            recurrenceSeries: true,
          },
        });

        return event ? toPublicEvent(event) : null;
      });
    }

    if (scope === "this_and_following" && input.recurrence) {
      return prisma.$transaction(async (tx) => {
        assertRecurrenceStartDate(input.recurrence!, sourceEvent.date);

        const sourceSeriesSnapshot = await tx.eventSeries.findFirst({
          where: {
            id: sourceSeries.id,
            userId,
          },
        });

        if (!sourceSeriesSnapshot) {
          throw new DbStateError("Recurring series not found");
        }

        await tx.event.deleteMany({
          where: {
            userId,
            recurrenceSeriesId: sourceSeries.id,
            date: {
              gte: sourceEvent.date,
            },
          },
        });

        const remainingOldEvents = await tx.event.count({
          where: {
            userId,
            recurrenceSeriesId: sourceSeries.id,
          },
        });

        if (remainingOldEvents === 0) {
          await tx.eventSeries.delete({
            where: {
              id: sourceSeries.id,
              userId,
            },
          });
        } else {
          await tx.eventSeries.update({
            where: {
              id: sourceSeries.id,
              userId,
            },
            data: {
              recurrenceUntil: dayBeforeDate(sourceEvent.date),
              recurrenceCount: null,
            },
          });
        }

        const splitDefaults = mergeSeriesDefaults(sourceSeriesSnapshot, input);
        const nextSeries = await tx.eventSeries.create({
          data: {
            userId,
            title: splitDefaults.title,
            description: splitDefaults.description,
            time: splitDefaults.time,
            type: splitDefaults.type,
            status: splitDefaults.status,
            startDate: sourceEvent.date,
            recurrenceFrequency: input.recurrence!.frequency,
            recurrenceInterval: input.recurrence!.interval,
            recurrenceCount: input.recurrence!.count ?? null,
            recurrenceUntil: input.recurrence!.until ?? null,
          },
        });

        const nextDates = generateRecurrenceDates(sourceEvent.date, input.recurrence!);
        await createSeriesEvents(
          tx,
          userId,
          nextSeries.id,
          splitDefaults,
          nextDates,
        );

        const firstSplitEvent = await tx.event.findFirst({
          where: {
            userId,
            recurrenceSeriesId: nextSeries.id,
          },
          include: {
            recurrenceSeries: true,
          },
          orderBy: [{ date: "asc" }, { time: "asc" }],
        });

        if (!firstSplitEvent) {
          throw new DbStateError("Failed to create split recurring series");
        }

        return toPublicEvent(firstSplitEvent);
      });
    }

    const eventUpdateManyData = buildEventUpdateManyData(input);
    if (hasFieldsToUpdate(eventUpdateManyData)) {
      await prisma.event.updateMany({
        where: {
          userId,
          recurrenceSeriesId: sourceSeries.id,
          recurrenceException: false,
          date: {
            gte: sourceEvent.date,
          },
        },
        data: eventUpdateManyData,
      });
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, userId },
      include: {
        recurrenceSeries: true,
      },
    });

    return event ? toPublicEvent(event) : null;
  }

  if (input.recurrence) {
    throw new DbStateError("recurrence can only be updated for recurring series with scope 'all' or 'this_and_following'");
  }

  const updateData = buildEventUpdateData(input);
  if (hasSeries && scope === "this") {
    updateData.recurrenceException = true;
  }

  try {
    const event = await prisma.event.update({
      where: { id: eventId, userId },
      data: updateData,
      include: {
        recurrenceSeries: true,
      },
    });
    return toPublicEvent(event);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }
    throw error;
  }
}

export async function deleteEventForUser(
  userId: string,
  eventId: string,
  options: { scope?: RecurrenceScope } = {},
): Promise<boolean> {
  const sourceEvent = await prisma.event.findFirst({
    where: {
      id: eventId,
      userId,
    },
    include: {
      recurrenceSeries: true,
    },
  });

  if (!sourceEvent) {
    return false;
  }

  const scope = options.scope ?? "this";
  const hasSeries = Boolean(sourceEvent.recurrenceSeriesId && sourceEvent.recurrenceSeries);

  if (hasSeries && scope !== "this") {
    return prisma.$transaction(async (tx) => {
      const seriesId = sourceEvent.recurrenceSeriesId!;

      if (scope === "all") {
        const deletedMany = await tx.event.deleteMany({
          where: {
            userId,
            recurrenceSeriesId: seriesId,
          },
        });

        await tx.eventSeries.delete({
          where: {
            id: seriesId,
            userId,
          },
        });

        return deletedMany.count > 0;
      }

      const deletedMany = await tx.event.deleteMany({
        where: {
          userId,
          recurrenceSeriesId: seriesId,
          date: {
            gte: sourceEvent.date,
          },
        },
      });

      if (deletedMany.count === 0) {
        return false;
      }

      const remaining = await tx.event.count({
        where: {
          userId,
          recurrenceSeriesId: seriesId,
        },
      });

      if (remaining === 0) {
        await tx.eventSeries.delete({
          where: {
            id: seriesId,
            userId,
          },
        });
      } else {
        await tx.eventSeries.update({
          where: {
            id: seriesId,
            userId,
          },
          data: {
            recurrenceUntil: dayBeforeDate(sourceEvent.date),
            recurrenceCount: null,
          },
        });
      }

      return true;
    });
  }

  const deleted = await prisma.event.deleteMany({
    where: {
      id: eventId,
      userId,
    },
  });

  if (deleted.count > 0 && sourceEvent.recurrenceSeriesId) {
    const remaining = await prisma.event.count({
      where: {
        userId,
        recurrenceSeriesId: sourceEvent.recurrenceSeriesId,
      },
    });

    if (remaining === 0) {
      await prisma.eventSeries.deleteMany({
        where: {
          id: sourceEvent.recurrenceSeriesId,
          userId,
        },
      });
    }
  }

  return deleted.count > 0;
}
