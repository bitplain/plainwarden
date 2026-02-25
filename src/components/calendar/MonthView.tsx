import { format, isSameDay, isSameMonth } from "date-fns";
import type { CalendarEvent } from "@/lib/types";
import { toDateKey } from "@/components/calendar/date-utils";

interface MonthViewProps {
  anchorDate: Date;
  days: Date[];
  eventsByDate: Record<string, CalendarEvent[]>;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (eventId: string) => void;
}

const MONTH_DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function MonthView({
  anchorDate,
  days,
  eventsByDate,
  onSelectDate,
  onSelectEvent,
}: MonthViewProps) {
  const today = new Date();

  return (
    <div className="calendar-card flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0e111d]/80">
      <div className="grid grid-cols-7 border-b border-white/10 bg-black/25">
        {MONTH_DAY_NAMES.map((name) => (
          <div
            key={name}
            className="border-r border-white/10 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 last:border-r-0"
          >
            {name}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 grid-rows-[repeat(6,minmax(120px,1fr))] md:grid-rows-[repeat(6,minmax(132px,1fr))]">
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
              className={`border-b border-r border-white/10 p-2 text-left align-top transition-colors last:border-r-0 ${
                isCurrentDay
                  ? "bg-sky-500/10"
                  : isCurrentMonth
                    ? "bg-transparent hover:bg-white/5"
                    : "bg-black/20 hover:bg-white/[0.04]"
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-xs font-semibold ${
                    isToday
                      ? "bg-sky-500 text-zinc-950"
                      : isCurrentMonth
                        ? "text-zinc-200 hover:bg-white/10"
                        : "text-zinc-600 hover:bg-white/[0.06]"
                  }`}
                >
                  {format(day, "d")}
                </button>
              </div>

              <div className="space-y-1">
                {visibleEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event.id)}
                    className={`w-full rounded-md border px-1.5 py-1 text-left text-[11px] font-medium transition-colors ${
                      event.type === "event"
                        ? "border-sky-400/25 bg-sky-500/12 text-sky-100 hover:bg-sky-500/20"
                        : "border-violet-400/25 bg-violet-500/12 text-violet-100 hover:bg-violet-500/20"
                    }`}
                  >
                    <span className="mr-1 text-zinc-400">{event.time ?? "--:--"}</span>
                    <span>{event.title}</span>
                  </button>
                ))}

                {extraCount > 0 && (
                  <p className="px-1 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                    +{extraCount} ещё
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
