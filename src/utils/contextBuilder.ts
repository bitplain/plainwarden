import type { DailyItem, UnifiedContext, UnifiedEntity } from "@/agent/types";
import type { CalendarEvent, KanbanCard, Note } from "@/lib/types";

interface BuildContextInput {
  events: CalendarEvent[];
  cards: KanbanCard[];
  notes: Note[];
  daily: DailyItem[];
}

interface BuildContextOptions {
  maxChars?: number;
}

function pushSource(entity: UnifiedEntity, source: UnifiedEntity["sources"][number]) {
  if (!entity.sources.includes(source)) {
    entity.sources.push(source);
  }
}

function toEventGlobalId(eventId: string): string {
  return `event:${eventId}`;
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1))}…`;
}

export function buildUnifiedContext(
  input: BuildContextInput,
  options: BuildContextOptions = {},
): UnifiedContext {
  const maxChars = options.maxChars ?? 3000;
  const entityMap = new Map<string, UnifiedEntity>();

  for (const event of input.events) {
    const globalEntityId = toEventGlobalId(event.id);
    entityMap.set(globalEntityId, {
      globalEntityId,
      title: event.title,
      sources: ["calendar"],
      date: event.date,
      status: event.status,
      event,
      cards: [],
      notes: [],
    });
  }

  for (const card of input.cards) {
    const linkedEventId = card.eventLinks?.[0];
    const globalEntityId = linkedEventId ? toEventGlobalId(linkedEventId) : `kanban:${card.id}`;

    const existing = entityMap.get(globalEntityId);
    if (existing) {
      existing.cards.push(card);
      pushSource(existing, "kanban");
      continue;
    }

    entityMap.set(globalEntityId, {
      globalEntityId,
      title: card.title,
      sources: ["kanban"],
      date: card.dueDate,
      event: undefined,
      status: undefined,
      cards: [card],
      notes: [],
    });
  }

  for (const note of input.notes) {
    const linkedEventId = note.eventLinks?.[0];
    const globalEntityId = linkedEventId ? toEventGlobalId(linkedEventId) : `note:${note.id}`;

    const existing = entityMap.get(globalEntityId);
    if (existing) {
      existing.notes.push(note);
      pushSource(existing, "notes");
      continue;
    }

    entityMap.set(globalEntityId, {
      globalEntityId,
      title: note.title,
      sources: ["notes"],
      date: undefined,
      status: undefined,
      event: undefined,
      cards: [],
      notes: [note],
    });
  }

  for (const dailyItem of input.daily) {
    const globalEntityId = dailyItem.linkedEventId
      ? toEventGlobalId(dailyItem.linkedEventId)
      : `daily:${dailyItem.id}`;
    const existing = entityMap.get(globalEntityId);
    if (existing) {
      pushSource(existing, "daily");
      if (!existing.date) {
        existing.date = dailyItem.date;
      }
      if (!existing.status) {
        existing.status = dailyItem.status;
      }
      continue;
    }

    entityMap.set(globalEntityId, {
      globalEntityId,
      title: dailyItem.title,
      sources: ["daily"],
      date: dailyItem.date,
      status: dailyItem.status,
      event: undefined,
      cards: [],
      notes: [],
    });
  }

  const entities = [...entityMap.values()].sort((a, b) => {
    const dateA = a.date ?? "9999-99-99";
    const dateB = b.date ?? "9999-99-99";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return a.title.localeCompare(b.title);
  });

  const snippetLines = entities.map((entity) => {
    const sources = entity.sources.join(",");
    const date = entity.date ? ` date=${entity.date}` : "";
    const time = entity.event?.time ? ` time=${entity.event.time}` : "";
    const status = entity.status ? ` status=${entity.status}` : "";
    return `- [${entity.globalEntityId}] ${entity.title} (${sources})${date}${time}${status}`;
  });

  const promptFragment = truncate(snippetLines.join("\n"), maxChars);

  return {
    entities,
    promptFragment,
  };
}
