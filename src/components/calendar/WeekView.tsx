import { format, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import type { CalendarEvent } from "@/lib/types";
import { toDateKey } from "@/components/calendar/date-utils";

interface WeekViewProps {
  weekDates: Date[];
  anchorDate: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (eventId: string) => void;
}

export default function WeekView({
  weekDates,
  anchorDate,
  eventsByDate,
  onSelectDate,
  onSelectEvent,
}: WeekViewProps) {
  const today = new Date();

  return (
    <div className="calendar-card flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0e111d]/80">
      <div className="overflow-x-auto">
        <div className="grid min-w-[840px] grid-cols-7">
          {weekDates.map((day) => {
            const dateKey = toDateKey(day);
            const dayEvents = eventsByDate[dateKey] ?? [];
            const isSelected = isSameDay(day, anchorDate);
            const isToday = isSameDay(day, today);

            return (
              <section key={dateKey} className="flex min-h-[520px] flex-col border-r border-white/10 last:border-r-0">
                <button
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={`border-b border-white/10 px-3 py-3 text-left transition-colors ${
                    isSelected ? "bg-sky-500/15" : "bg-black/25 hover:bg-white/5"
                  }`}
                >
                  <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                    {format(day, "EEEE", { locale: ru })}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <span
                      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs ${
                        isToday ? "bg-sky-500 text-zinc-950" : "bg-white/10 text-zinc-100"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    <span>{format(day, "LLL", { locale: ru })}</span>
                  </p>
                </button>

                <div className="flex-1 space-y-2 overflow-y-auto p-3">
                  {dayEvents.length === 0 && (
                    <div className="rounded-lg border border-dashed border-white/12 px-2 py-3 text-xs text-zinc-500">
                      Нет событий
                    </div>
                  )}

                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent(event.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                        event.type === "event"
                          ? "border-sky-400/25 bg-sky-500/12 text-sky-100 hover:bg-sky-500/20"
                          : "border-violet-400/25 bg-violet-500/12 text-violet-100 hover:bg-violet-500/20"
                      }`}
                    >
                      <p className="text-xs text-zinc-300">{event.time ?? "Без времени"}</p>
                      <p className="mt-0.5 text-sm font-medium">{event.title}</p>
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
