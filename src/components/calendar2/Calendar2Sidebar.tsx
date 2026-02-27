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
  neutral: "bg-[rgba(255,255,255,0.06)] text-[var(--cal2-text-primary)] border-[var(--cal2-border)]",
  sky: "bg-[rgba(255,255,255,0.06)] text-[var(--cal2-text-primary)] border-[var(--cal2-border)]",
  violet: "bg-[var(--cal2-accent-soft)] text-[var(--cal2-text-primary)] border-[rgba(94,106,210,0.42)]",
  amber: "bg-[rgba(255,255,255,0.06)] text-[var(--cal2-text-primary)] border-[var(--cal2-border)]",
  emerald: "bg-[rgba(255,255,255,0.06)] text-[var(--cal2-text-primary)] border-[var(--cal2-border)]",
  rose: "bg-[rgba(255,255,255,0.06)] text-[var(--cal2-text-primary)] border-[var(--cal2-border)]",
  indigo: "bg-[var(--cal2-accent-soft)] text-[var(--cal2-text-primary)] border-[rgba(94,106,210,0.42)]",
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
    <aside className="flex h-full flex-col gap-3 overflow-y-auto border-r border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] p-3 sm:p-4">
      {/* Mini calendar */}
      <section className="rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)]">Мини-календарь</h2>
          <span className="text-[11px] text-[var(--cal2-text-secondary)]">
            {format(anchorDate, "LLLL yyyy", { locale: ru })}
          </span>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1 text-center">
          {MINI_DAY_NAMES.map((name) => (
            <div
              key={name}
              className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--cal2-text-secondary)]"
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
                className={`relative h-7 rounded-[4px] border text-[11px] transition-colors ${
                  isCurrentDay
                    ? "border-[rgba(94,106,210,0.42)] bg-[var(--cal2-accent-soft)] font-medium text-[var(--cal2-text-primary)]"
                    : isToday
                      ? "border-[rgba(94,106,210,0.35)] bg-[rgba(94,106,210,0.1)] text-[#ccd2ff]"
                      : isCurrentMonth
                        ? "border-transparent text-[var(--cal2-text-primary)] hover:bg-[rgba(255,255,255,0.05)]"
                        : "border-transparent text-[var(--cal2-text-disabled)] hover:bg-[rgba(255,255,255,0.03)]"
                }`}
              >
                {format(day, "d")}
                {hasEvents && (
                  <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--cal2-accent)]" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      {activeTab === "calendar" && (
        <section className="rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-3">
          <h2 className="mb-3 text-[13px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)]">Фильтры</h2>
          <div className="space-y-1.5">
            {categories.map((cat) => {
              const isActive = cat.id === activeFilter;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onFilterChange(cat.id)}
                  className={`flex w-full items-center justify-between rounded-[6px] border px-3 py-2 text-[12px] transition-colors ${
                    isActive
                      ? TONE_CLASSES[cat.tone] ?? TONE_CLASSES.neutral
                      : "border-[var(--cal2-border)] bg-transparent text-[var(--cal2-text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--cal2-text-primary)]"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="rounded-[4px] border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-[10px]">
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Notes for selected date */}
      {dateNotes.length > 0 && (
        <section className="rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-3">
          <h2 className="mb-3 text-[13px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)]">
            Заметки на {format(anchorDate, "d MMM", { locale: ru })}
          </h2>
          <div className="space-y-2">
            {dateNotes.map((note) => (
              <div
                key={note.id}
                className="rounded-[6px] border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.03)] p-2.5"
              >
                <p className="text-[12px] font-medium leading-[1.2] text-[var(--cal2-text-primary)]">{note.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] text-[var(--cal2-text-secondary)]">{note.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
