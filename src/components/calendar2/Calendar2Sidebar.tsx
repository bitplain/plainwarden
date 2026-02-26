"use client";

import { format, isSameDay, isSameMonth } from "date-fns";
import { ru } from "date-fns/locale";
import type { CalendarEvent } from "@/lib/types";
import {
  getMonthGridDates,
  toDateKey,
} from "@/components/calendar/date-utils";
import type { SidebarCategory, Note, Calendar2Tab } from "./calendar2-types";

interface Calendar2SidebarProps {
  anchorDate: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  categories: SidebarCategory[];
  activeFilter: string;
  onSelectDate: (date: Date) => void;
  onFilterChange: (filter: string) => void;
  notes: Note[];
  activeTab: Calendar2Tab;
}

const MINI_DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-zinc-500/15 text-zinc-200 border-zinc-400/20",
  sky: "bg-sky-500/15 text-sky-200 border-sky-400/20",
  violet: "bg-violet-500/15 text-violet-200 border-violet-400/20",
  amber: "bg-amber-500/15 text-amber-200 border-amber-400/20",
  emerald: "bg-emerald-500/15 text-emerald-200 border-emerald-400/20",
  rose: "bg-rose-500/15 text-rose-200 border-rose-400/20",
  indigo: "bg-indigo-500/15 text-indigo-200 border-indigo-400/20",
};

export default function Calendar2Sidebar({
  anchorDate,
  eventsByDate,
  categories,
  activeFilter,
  onSelectDate,
  onFilterChange,
  notes,
  activeTab,
}: Calendar2SidebarProps) {
  const miniMonthDays = getMonthGridDates(anchorDate);
  const today = new Date();

  const dateKey = toDateKey(anchorDate);
  const dateNotes = notes.filter((n) => n.linkedDate === dateKey);

  return (
    <aside className="flex h-full flex-col gap-3 overflow-y-auto border-r border-white/[0.06] bg-[#0f0f1a]/80 p-3 sm:p-4">
      {/* Mini calendar */}
      <section className="rounded-xl border border-white/[0.06] bg-[#16162a]/60 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Мини-календарь</h2>
          <span className="text-xs text-zinc-500">
            {format(anchorDate, "LLLL yyyy", { locale: ru })}
          </span>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1 text-center">
          {MINI_DAY_NAMES.map((name) => (
            <div
              key={name}
              className="text-[10px] font-semibold uppercase tracking-[0.11em] text-zinc-500"
            >
              {name}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
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
                className={`relative h-7 rounded-md text-xs transition-colors ${
                  isCurrentDay
                    ? "bg-indigo-500/80 text-white font-medium"
                    : isToday
                      ? "bg-indigo-500/20 text-indigo-200"
                      : isCurrentMonth
                        ? "text-zinc-300 hover:bg-white/[0.06]"
                        : "text-zinc-600 hover:bg-white/[0.04]"
                }`}
              >
                {format(day, "d")}
                {hasEvents && (
                  <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-indigo-400" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      {activeTab === "calendar" && (
        <section className="rounded-xl border border-white/[0.06] bg-[#16162a]/60 p-3">
          <h2 className="mb-3 text-sm font-semibold text-zinc-100">Фильтры</h2>
          <div className="space-y-1.5">
            {categories.map((cat) => {
              const isActive = cat.id === activeFilter;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onFilterChange(cat.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? TONE_CLASSES[cat.tone] ?? TONE_CLASSES.neutral
                      : "border-white/[0.06] bg-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="rounded-md bg-black/30 px-2 py-0.5 text-xs">{cat.count}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Notes for selected date */}
      {dateNotes.length > 0 && (
        <section className="rounded-xl border border-white/[0.06] bg-[#16162a]/60 p-3">
          <h2 className="mb-3 text-sm font-semibold text-zinc-100">
            Заметки на {format(anchorDate, "d MMM", { locale: ru })}
          </h2>
          <div className="space-y-2">
            {dateNotes.map((note) => (
              <div
                key={note.id}
                className="rounded-lg border border-white/[0.06] bg-black/20 p-2.5"
              >
                <p className="text-sm font-medium text-zinc-200">{note.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{note.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
