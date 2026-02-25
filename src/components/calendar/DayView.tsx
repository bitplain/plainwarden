import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { CalendarEvent } from "@/lib/types";
import {
  DAY_VIEW_END_HOUR,
  DAY_VIEW_START_HOUR,
  getDaySlots,
} from "@/components/calendar/date-utils";

interface DayViewProps {
  dayDate: Date;
  dayEvents: CalendarEvent[];
  onSelectEvent: (eventId: string) => void;
}

function getEventHour(event: CalendarEvent): number | null {
  if (!event.time) {
    return null;
  }

  const [hours] = event.time.split(":");
  const parsedHours = Number(hours);
  if (!Number.isFinite(parsedHours)) {
    return null;
  }

  return parsedHours;
}

export default function DayView({ dayDate, dayEvents, onSelectEvent }: DayViewProps) {
  const slots = getDaySlots(dayDate);
  const slottedEvents = new Map<number, CalendarEvent[]>();
  const unscheduledEvents: CalendarEvent[] = [];
  const outsideGridEvents: CalendarEvent[] = [];

  for (const event of dayEvents) {
    const eventHour = getEventHour(event);

    if (eventHour === null) {
      unscheduledEvents.push(event);
      continue;
    }

    if (eventHour < DAY_VIEW_START_HOUR || eventHour > DAY_VIEW_END_HOUR) {
      outsideGridEvents.push(event);
      continue;
    }

    const existingEvents = slottedEvents.get(eventHour) ?? [];
    existingEvents.push(event);
    slottedEvents.set(eventHour, existingEvents);
  }

  return (
    <div className="calendar-card flex h-full min-h-0 flex-col overflow-hidden rounded-sm border border-white/10 bg-black/40">
      <div className="border-b border-white/10 bg-black/25 px-4 py-3">
        <p className="text-sm font-semibold text-zinc-100">{format(dayDate, "EEEE, d MMMM", { locale: ru })}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
        {dayEvents.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/12 p-4 text-sm text-zinc-500">
            На этот день пока нет событий.
          </div>
        )}

        {unscheduledEvents.length > 0 && (
          <section className="mb-4 rounded-xl border border-white/10 bg-black/25 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Без времени
            </h3>
            <div className="space-y-2">
              {unscheduledEvents.map((event) => (
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
                  <p className="text-sm font-medium">{event.title}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {outsideGridEvents.length > 0 && (
          <section className="mb-4 rounded-xl border border-white/10 bg-black/25 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Вне сетки 08:00–21:00
            </h3>
            <div className="space-y-2">
              {outsideGridEvents.map((event) => (
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
                  <p className="text-xs text-zinc-300">{event.time ?? "--:--"}</p>
                  <p className="text-sm font-medium">{event.title}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-2">
          {slots.map((slot) => {
            const hour = Number(format(slot, "H"));
            const slotEvents = slottedEvents.get(hour) ?? [];

            return (
              <div
                key={slot.toISOString()}
                className="grid grid-cols-[70px_1fr] items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-2 py-2 sm:px-3"
              >
                <div className="pt-1 text-xs font-medium text-zinc-500">{format(slot, "HH:mm")}</div>
                <div className="space-y-2">
                  {slotEvents.length === 0 && (
                    <p className="rounded-lg border border-dashed border-white/12 px-2 py-2 text-xs text-zinc-600">
                      Свободно
                    </p>
                  )}

                  {slotEvents.map((event) => (
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
                      <p className="text-xs text-zinc-300">{event.time ?? "--:--"}</p>
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
