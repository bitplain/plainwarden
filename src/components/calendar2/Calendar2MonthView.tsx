"use client";

import { format, isSameDay, isSameMonth } from "date-fns";
import type { CalendarEvent } from "@/lib/types";
import { toDateKey } from "@/components/calendar/date-utils";
import { PRIORITY_CONFIG, type TaskPriority } from "./calendar2-types";

interface Calendar2MonthViewProps {
  anchorDate: Date;
  days: Date[];
  eventsByDate: Record<string, CalendarEvent[]>;
  eventPriorities: Record<string, TaskPriority>;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (eventId: string) => void;
  onQuickAdd: (date: Date) => void;
}

const MONTH_DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

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

export default function Calendar2MonthView({
  anchorDate,
  days,
  eventsByDate,
  eventPriorities,
  onSelectDate,
  onSelectEvent,
  onQuickAdd,
}: Calendar2MonthViewProps) {
  const today = new Date();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#12122a]/40">
      <div className="grid grid-cols-7 border-b border-white/[0.06] bg-[#16162a]/40">
        {MONTH_DAY_NAMES.map((name) => (
          <div
            key={name}
            className="border-r border-white/[0.06] px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 last:border-r-0"
          >
            {name}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 grid-rows-[repeat(6,minmax(100px,1fr))] md:grid-rows-[repeat(6,minmax(120px,1fr))]">
        {days.map((day) => {
          const dateKey = toDateKey(day);
          const dayEvents = eventsByDate[dateKey] ?? [];
          const visibleEvents = dayEvents.slice(0, 3);
          const extraCount = dayEvents.length - visibleEvents.length;
          const isCurrentMonth = isSameMonth(day, anchorDate);
          const isCurrentDay = isSameDay(day, anchorDate);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={dateKey}
              onClick={() => onQuickAdd(day)}
              className={`group cursor-pointer border-b border-r border-white/[0.06] p-1.5 text-left transition-colors last:border-r-0 ${
                isCurrentDay
                  ? "bg-indigo-500/[0.08]"
                  : isCurrentMonth
                    ? "bg-transparent hover:bg-white/[0.02]"
                    : "bg-black/20 hover:bg-white/[0.02]"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDate(day);
                  }}
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-xs font-semibold transition-colors ${
                    isToday
                      ? "bg-indigo-500 text-white"
                      : isCurrentMonth
                        ? "text-zinc-300 hover:bg-white/[0.08]"
                        : "text-zinc-600 hover:bg-white/[0.04]"
                  }`}
                >
                  {format(day, "d")}
                </button>
                <span className="text-[10px] text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
                  +
                </span>
              </div>

              <div className="space-y-0.5">
                {visibleEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(event.id);
                    }}
                    className={`w-full truncate rounded-md border px-1.5 py-0.5 text-left text-[10px] font-medium transition-colors hover:brightness-125 ${getEventStyle(event, eventPriorities)}`}
                  >
                    {event.time && (
                      <span className="mr-1 text-white/40">{event.time}</span>
                    )}
                    {event.title}
                  </button>
                ))}

                {extraCount > 0 && (
                  <p className="px-1 text-[10px] font-medium text-zinc-600">
                    +{extraCount}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
