import type { Prisma } from "@prisma/client";
import type { EventListFilters, EventStatus, EventType } from "@/lib/types";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isEventType(value: string): value is EventType {
  return value === "event" || value === "task";
}

function isEventStatus(value: string): value is EventStatus {
  return value === "pending" || value === "done";
}

function readDateParam(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim();
  return ISO_DATE_REGEX.test(normalized) ? normalized : undefined;
}

export function parseEventListFilters(searchParams: URLSearchParams): EventListFilters {
  const qRaw = searchParams.get("q");
  const q = qRaw?.trim() ? qRaw.trim() : undefined;

  const typeRaw = searchParams.get("type");
  const type = typeRaw && isEventType(typeRaw) ? typeRaw : undefined;

  const statusRaw = searchParams.get("status");
  const status = statusRaw && isEventStatus(statusRaw) ? statusRaw : undefined;

  const dateFrom = readDateParam(searchParams.get("dateFrom"));
  const dateTo = readDateParam(searchParams.get("dateTo"));

  return {
    q,
    type,
    status,
    dateFrom,
    dateTo,
  };
}

export function buildEventListWhereInput(
  userId: string,
  filters: EventListFilters,
): Prisma.EventWhereInput {
  const where: Prisma.EventWhereInput = { userId };

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) {
      where.date.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      where.date.lte = filters.dateTo;
    }
  }

  if (filters.q) {
    where.OR = [
      {
        title: {
          contains: filters.q,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: filters.q,
          mode: "insensitive",
        },
      },
    ];
  }

  return where;
}
