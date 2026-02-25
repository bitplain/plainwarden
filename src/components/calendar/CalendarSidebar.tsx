import { format, isSameDay, isSameMonth } from "date-fns";
import { ru } from "date-fns/locale";
import type { CalendarEvent } from "@/lib/types";
import type {
  CalendarFilter,
  SidebarCategory,
  UpcomingEvent,
} from "@/components/calendar/calendar-types";
import { getMonthGridDates, toDateKey } from "@/components/calendar/date-utils";

interface CalendarSidebarProps {
  anchorDate: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  categories: SidebarCategory[];
  activeFilter: CalendarFilter;
  upcoming: UpcomingEvent[];
  onSelectDate: (date: Date) => void;
  onFilterChange: (filter: CalendarFilter) => void;
}

const MINI_DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const CATEGORY_TONE: Record<SidebarCategory["tone"], string> = {
  neutral: "bg-zinc-500/15 text-zinc-200 border-zinc-400/25",
  sky: "bg-sky-500/15 text-sky-200 border-sky-400/25",
  violet: "bg-violet-500/15 text-violet-200 border-violet-400/25",
  amber: "bg-amber-500/15 text-amber-200 border-amber-400/25",
  emerald: "bg-emerald-500/15 text-emerald-200 border-emerald-400/25",
};

export default function CalendarSidebar({
  anchorDate,
  eventsByDate,
  categories,
  activeFilter,
  upcoming,
  onSelectDate,
  onFilterChange,
}: CalendarSidebarProps) {
  const miniMonthDays = getMonthGridDates(anchorDate);
  const today = new Date();

  return (
    <aside className="flex h-full flex-col gap-4 overflow-y-auto border-r border-white/10 bg-black/25 p-4 sm:p-5">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Мини-календарь</h2>
          <span className="text-xs text-zinc-400">{format(anchorDate, "LLLL yyyy", { locale: ru })}</span>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1 text-center">
          {MINI_DAY_NAMES.map((name) => (
            <div key={name} className="text-[10px] font-semibold uppercase tracking-[0.11em] text-zinc-500">
              {name}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {miniMonthDays.map((day) => {
            const key = toDateKey(day);
            const hasEvents = (eventsByDate[key]?.length ?? 0) > 0;
            const isCurrentDay = isSameDay(day, anchorDate);
            const isToday = isSameDay(day, today);
            const isCurrentMonth = isSameMonth(day, anchorDate);

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDate(day)}
                className={`relative h-8 rounded-lg text-xs transition-colors ${
                  isCurrentDay
                    ? "bg-sky-500 text-zinc-950"
                    : isToday
                      ? "bg-sky-500/20 text-sky-200"
                      : isCurrentMonth
                        ? "text-zinc-200 hover:bg-white/10"
                        : "text-zinc-600 hover:bg-white/5"
                }`}
              >
                {format(day, "d")}
                {hasEvents && (
                  <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-violet-300" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-100">Категории</h2>
        <div className="space-y-2">
          {categories.map((category) => {
            const isActive = category.id === activeFilter;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onFilterChange(category.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors ${
                  isActive ? CATEGORY_TONE[category.tone] : "border-white/10 bg-black/30 text-zinc-300 hover:bg-white/10"
                }`}
              >
                <span>{category.label}</span>
                <span className="rounded-lg bg-black/35 px-2 py-0.5 text-xs">{category.count}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-100">Ближайшие</h2>
        <div className="space-y-2.5">
          {upcoming.length === 0 && <p className="text-sm text-zinc-500">Нет ближайших событий.</p>}

          {upcoming.map(({ event, startsAt }) => (
            <article key={event.id} className="rounded-xl border border-white/10 bg-black/35 p-3">
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-sm font-medium text-zinc-100">{event.title}</p>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] ${
                    event.type === "event"
                      ? "bg-sky-500/20 text-sky-200"
                      : "bg-violet-500/20 text-violet-200"
                  }`}
                >
                  {event.type === "event" ? "Событие" : "Задача"}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {event.time
                  ? format(startsAt, "d MMM, HH:mm", { locale: ru })
                  : format(startsAt, "d MMM", { locale: ru })}
              </p>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
}
