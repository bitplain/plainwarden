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

export default function Calendar2WeekView({
  weekDates,
  anchorDate,
  eventsByDate,
  eventPriorities,
  onSelectDate,
  onSelectEvent,
  onQuickAdd,
}: Calendar2WeekViewProps) {
  const today = new Date();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#12122a]/40">
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
                className="flex min-h-[520px] flex-col border-r border-white/[0.06] last:border-r-0"
              >
                <button
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={`border-b border-white/[0.06] px-3 py-3 text-left transition-colors ${
                    isSelected
                      ? "bg-indigo-500/[0.1]"
                      : "bg-[#16162a]/30 hover:bg-white/[0.03]"
                  }`}
                >
                  <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                    {format(day, "EEEE", { locale: ru })}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <span
                      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs ${
                        isToday
                          ? "bg-indigo-500 text-white"
                          : "bg-white/[0.06] text-zinc-200"
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
                      className="w-full rounded-lg border border-dashed border-white/[0.08] px-2 py-3 text-xs text-zinc-600 transition-colors hover:border-indigo-400/20 hover:text-indigo-300"
                    >
                      + Добавить
                    </button>
                  )}

                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent(event.id)}
                      className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors hover:brightness-125 ${getEventStyle(event, eventPriorities)}`}
                    >
                      <p className="text-[11px] text-white/40">{event.time ?? "—"}</p>
                      <p className="mt-0.5 text-sm font-medium">{event.title}</p>
                      {event.status === "done" && (
                        <span className="mt-1 inline-block rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
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
