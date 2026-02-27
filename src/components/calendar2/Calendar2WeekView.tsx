"use client";

import { format, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import type { CalendarEvent } from "@/lib/types";
import { toDateKey } from "@/components/calendar/date-utils";
import { PRIORITY_CONFIG, type TaskPriority } from "./calendar2-types";

interface Calendar2WeekViewProps {
  weekDates: Date[];
  anchorDate: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  eventPriorities: Record<string, TaskPriority>;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (eventId: string) => void;
  onQuickAdd: (date: Date) => void;
  onMoveEvent: (eventId: string, payload: { date: string; time?: string }) => void | Promise<void>;
}

function getEventStyle(event: CalendarEvent, priorities: Record<string, TaskPriority>) {
  const priority = priorities[event.id];
  if (priority) {
    const config = PRIORITY_CONFIG[priority];
    return `${config.bg} ${config.border} ${config.color}`;
  }
  return event.type === "event"
    ? "bg-[var(--cal2-accent-soft)] border-[rgba(94,106,210,0.4)] text-[#d6dbff]"
    : "bg-[rgba(255,255,255,0.06)] border-[var(--cal2-border)] text-[var(--cal2-text-primary)]";
}

export default function Calendar2WeekView({
  weekDates,
  anchorDate,
  eventsByDate,
  eventPriorities,
  onSelectDate,
  onSelectEvent,
  onQuickAdd,
  onMoveEvent,
}: Calendar2WeekViewProps) {
  const today = new Date();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)]">
      <div className="overflow-x-auto">
        <div className="grid min-w-[840px] grid-cols-7">
          {weekDates.map((day) => {
            const dateKey = toDateKey(day);
            const dayEvents = eventsByDate[dateKey] ?? [];
            const isSelected = isSameDay(day, anchorDate);
            const isToday = isSameDay(day, today);

            return (
              <section
                key={dateKey}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const draggedEventId = event.dataTransfer.getData("text/plain");
                  if (draggedEventId) {
                    void onMoveEvent(draggedEventId, { date: dateKey });
                  }
                }}
                className="flex min-h-[520px] flex-col border-r border-[var(--cal2-border)] last:border-r-0"
              >
                <button
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={`border-b border-[var(--cal2-border)] px-3 py-3 text-left transition-colors ${
                    isSelected
                      ? "bg-[var(--cal2-accent-soft)]"
                      : "bg-[var(--cal2-surface-2)] hover:bg-[rgba(255,255,255,0.03)]"
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--cal2-text-secondary)]">
                    {format(day, "EEEE", { locale: ru })}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-[13px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)]">
                    <span
                      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-[4px] px-2 text-[11px] ${
                        isToday
                          ? "border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent)] text-[var(--cal2-text-primary)]"
                          : "border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.04)] text-[var(--cal2-text-primary)]"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    <span>{format(day, "LLL", { locale: ru })}</span>
                  </p>
                </button>

                <div className="flex-1 space-y-1.5 overflow-y-auto p-2.5">
                  {dayEvents.length === 0 && (
                    <button
                      type="button"
                      onClick={() => onQuickAdd(day)}
                      className="w-full rounded-[6px] border border-dashed border-[var(--cal2-border)] px-2 py-3 text-[11px] text-[var(--cal2-text-secondary)] transition-colors hover:border-[rgba(94,106,210,0.4)] hover:text-[var(--cal2-text-primary)]"
                    >
                      + Добавить
                    </button>
                  )}

                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      draggable
                      onDragStart={(dragEvent) => {
                        dragEvent.dataTransfer.effectAllowed = "move";
                        dragEvent.dataTransfer.setData("text/plain", event.id);
                      }}
                      onClick={() => onSelectEvent(event.id)}
                      className={`w-full rounded-[6px] border px-2.5 py-2 text-left transition-colors hover:bg-[rgba(255,255,255,0.1)] ${getEventStyle(event, eventPriorities)}`}
                    >
                      <p className="text-[10px] text-[var(--cal2-text-secondary)]">{event.time ?? "—"}</p>
                      <p className="mt-0.5 text-[13px] font-medium leading-[1.2]">{event.title}</p>
                      {event.status === "done" && (
                        <span className="mt-1 inline-block rounded-[4px] border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 text-[10px] text-[var(--cal2-text-secondary)]">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
