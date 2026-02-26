"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { CalendarEvent } from "@/lib/types";
import {
  DAY_VIEW_END_HOUR,
  DAY_VIEW_START_HOUR,
  getDaySlots,
} from "@/components/calendar/date-utils";
import { PRIORITY_CONFIG, type TaskPriority } from "./calendar2-types";

interface Calendar2DayViewProps {
  dayDate: Date;
  dayEvents: CalendarEvent[];
  eventPriorities: Record<string, TaskPriority>;
  onSelectEvent: (eventId: string) => void;
}

function getEventHour(event: CalendarEvent): number | null {
  if (!event.time) {
    return null;
  }
  const [hours] = event.time.split(":");
  const parsed = Number(hours);
  return Number.isFinite(parsed) ? parsed : null;
}

function getEventStyle(event: CalendarEvent, priorities: Record<string, TaskPriority>) {
  const priority = priorities[event.id];
  if (priority) {
    const config = PRIORITY_CONFIG[priority];
    return `${config.bg} ${config.border} ${config.color}`;
  }
  return event.type === "event"
    ? "bg-indigo-500/12 border-indigo-400/25 text-indigo-200"
    : "bg-violet-500/12 border-violet-400/25 text-violet-200";
}

export default function Calendar2DayView({
  dayDate,
  dayEvents,
  eventPriorities,
  onSelectEvent,
}: Calendar2DayViewProps) {
  const slots = getDaySlots(dayDate);
  const slottedEvents = new Map<number, CalendarEvent[]>();
  const unscheduledEvents: CalendarEvent[] = [];
  const outsideGridEvents: CalendarEvent[] = [];

  for (const event of dayEvents) {
    const hour = getEventHour(event);
    if (hour === null) {
      unscheduledEvents.push(event);
    } else if (hour < DAY_VIEW_START_HOUR || hour > DAY_VIEW_END_HOUR) {
      outsideGridEvents.push(event);
    } else {
      const list = slottedEvents.get(hour) ?? [];
      list.push(event);
      slottedEvents.set(hour, list);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#12122a]/40">
      <div className="border-b border-white/[0.06] bg-[#16162a]/40 px-4 py-3">
        <p className="text-sm font-semibold text-zinc-100">
          {format(dayDate, "EEEE, d MMMM", { locale: ru })}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
        {dayEvents.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/[0.08] p-4 text-sm text-zinc-600">
            На этот день пока нет событий.
          </div>
        )}

        {unscheduledEvents.length > 0 && (
          <section className="mb-4 rounded-xl border border-white/[0.06] bg-[#16162a]/30 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Без времени
            </h3>
            <div className="space-y-1.5">
              {unscheduledEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onSelectEvent(event.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors hover:brightness-125 ${getEventStyle(event, eventPriorities)}`}
                >
                  <p className="text-sm font-medium">{event.title}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {outsideGridEvents.length > 0 && (
          <section className="mb-4 rounded-xl border border-white/[0.06] bg-[#16162a]/30 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Вне сетки 08:00–21:00
            </h3>
            <div className="space-y-1.5">
              {outsideGridEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onSelectEvent(event.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors hover:brightness-125 ${getEventStyle(event, eventPriorities)}`}
                >
                  <p className="text-[11px] text-white/40">{event.time ?? "--:--"}</p>
                  <p className="text-sm font-medium">{event.title}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-1.5">
          {slots.map((slot) => {
            const hour = Number(format(slot, "H"));
            const slotEvents = slottedEvents.get(hour) ?? [];

            return (
              <div
                key={slot.toISOString()}
                className="grid grid-cols-[60px_1fr] items-start gap-3 rounded-lg border border-white/[0.06] bg-[#16162a]/20 px-2 py-2 sm:px-3"
              >
                <div className="pt-1 text-xs font-medium text-zinc-500">
                  {format(slot, "HH:mm")}
                </div>
                <div className="space-y-1.5">
                  {slotEvents.length === 0 && (
                    <p className="rounded-md border border-dashed border-white/[0.06] px-2 py-2 text-xs text-zinc-700">
                      Свободно
                    </p>
                  )}

                  {slotEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent(event.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors hover:brightness-125 ${getEventStyle(event, eventPriorities)}`}
                    >
                      <p className="text-[11px] text-white/40">{event.time ?? "--:--"}</p>
                      <p className="text-sm font-medium">{event.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
