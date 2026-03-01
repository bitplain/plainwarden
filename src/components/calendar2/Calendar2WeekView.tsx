"use client";

import React, { useCallback, useRef } from "react";
import { format, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import type { CalendarEvent } from "@/lib/types";
import { toDateKey } from "@/components/calendar2/date-utils";
import { PRIORITY_CONFIG, type TaskPriority } from "./calendar2-types";

interface Calendar2WeekViewProps {
  weekDates: Date[];
  anchorDate: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  eventPriorities: Record<string, TaskPriority>;
  glowingCellKey: string | null;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (eventId: string) => void;
  onQuickAdd: (date: Date) => void;
  onMoveEvent: (eventId: string, payload: { date: string; time?: string }) => void | Promise<void>;
}

function getEventStyle(event: CalendarEvent, priorities?: Record<string, TaskPriority>) {
  return event.type === "event"
    ? "bg-[#1E3A8A20] border-[#3B82F6] text-[#93C5FD] rounded-[8px]" // Мягкий синий фон, событие
    : "bg-[#2A2A2A] border-[#3A3A3A] text-[#E5E5E5] rounded-[6px]"; // Нейтральный фон, задача
}
const EMPTY_DAY_EVENTS: CalendarEvent[] = [];

/* ── Isolated week-day column ── */

interface WeekDayColumnProps {
  day: Date;
  dateKey: string;
  dayEvents: CalendarEvent[];
  eventPriorities: Record<string, TaskPriority>;
  isSelected: boolean;
  isToday: boolean;
  isGlowing: boolean;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (eventId: string) => void;
  onQuickAdd: (date: Date) => void;
  onMoveEvent: (eventId: string, payload: { date: string; time?: string }) => void | Promise<void>;
}

const WeekDayColumn = React.memo(function WeekDayColumn({
  day,
  dateKey,
  dayEvents,
  eventPriorities,
  isSelected,
  isToday,
  isGlowing,
  onSelectDate,
  onSelectEvent,
  onQuickAdd,
  onMoveEvent,
}: WeekDayColumnProps) {
  const columnRef = useRef<HTMLElement>(null);
  const markDragOver = useCallback(() => {
    const column = columnRef.current;
    if (!column) {
      return;
    }

    const activeTargets = document.querySelectorAll<HTMLElement>(
      ".cal2-drop-target[data-drag-over]",
    );
    for (const target of activeTargets) {
      if (target !== column) {
        target.removeAttribute("data-drag-over");
      }
    }

    column.setAttribute("data-drag-over", "true");
  }, []);

  const clearDragOver = useCallback(() => {
    columnRef.current?.removeAttribute("data-drag-over");
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    markDragOver();
  }, [markDragOver]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLElement>) => {
    const related = event.relatedTarget as Node | null;
    if (related && columnRef.current?.contains(related)) {
      return;
    }
    clearDragOver();
  }, [clearDragOver]);

  return (
    <section
      ref={columnRef}
      onDragEnter={handleDragEnter}
      onDragOver={(e) => {
        e.preventDefault();
        markDragOver();
      }}
      onDragLeave={handleDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        clearDragOver();
        const draggedEventId = e.dataTransfer.getData("text/plain");
        if (draggedEventId) {
          void onMoveEvent(draggedEventId, { date: dateKey });
        }
      }}
      className={[
        "cal2-drop-target relative flex min-h-[520px] flex-col border-r border-[var(--cal2-border)] last:border-r-0",
        isGlowing ? "cal2-cell-drop-flash" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ contain: "layout style paint" }}
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
            className="relative flex flex-col w-full border border-dashed border-[var(--cal2-border)] px-2 py-3 text-[11px] text-[var(--cal2-text-secondary)] transition-colors hover:border-[rgba(94,106,210,0.4)] hover:text-[var(--cal2-text-primary)]"
          >
            + Добавить
          </button>
        )}

        {dayEvents.map((event) => {
          return (
            <button
              key={event.id}
              type="button"
              draggable
              onDragStartCapture={(dragEvent) => {
                dragEvent.dataTransfer.effectAllowed = "move";
                dragEvent.dataTransfer.setData("text/plain", event.id);
              }}
              onClick={() => onSelectEvent(event.id)}
              className={`relative flex flex-col w-full border px-2.5 py-2 text-left transition-colors hover:brightness-110 ${getEventStyle(event)}`}
            >
              {event.type === "task" && eventPriorities[event.id] && (
                <div
                  className={`absolute left-0 top-0 bottom-0 w-[4px] rounded-l-[5px] ${PRIORITY_CONFIG[eventPriorities[event.id]].dot}`}
                />
              )}
              <div className={`w-full ${event.type === "task" && eventPriorities[event.id] ? "ml-1.5" : ""}`}>

              <p className="text-[10px] text-[#9CA3AF] opacity-80">{event.time ?? "—"}</p>
              <p className="mt-0.5 text-[13px] font-medium leading-[1.2]">{event.title}</p>
              </div>

              {event.status === "done" && (
                <span className="mt-1 inline-block rounded-[4px] border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 text-[10px] text-[var(--cal2-text-secondary)]">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
});

/* ── Week view grid ── */

export default function Calendar2WeekView({
  weekDates,
  anchorDate,
  eventsByDate,
  eventPriorities,
  glowingCellKey,
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
            const dayEvents = eventsByDate[dateKey] ?? EMPTY_DAY_EVENTS;

            return (
              <WeekDayColumn
                key={dateKey}
                day={day}
                dateKey={dateKey}
                dayEvents={dayEvents}
                eventPriorities={eventPriorities}
                isSelected={isSameDay(day, anchorDate)}
                isToday={isSameDay(day, today)}
                isGlowing={glowingCellKey != null && glowingCellKey.startsWith(dateKey)}
                onSelectDate={onSelectDate}
                onSelectEvent={onSelectEvent}
                onQuickAdd={onQuickAdd}
                onMoveEvent={onMoveEvent}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
