"use client";

import React, { useCallback, useRef } from "react";
import { format, isSameDay, isSameMonth } from "date-fns";
import type { CalendarEvent } from "@/lib/types";
import { toDateKey } from "@/components/calendar2/date-utils";
import { CALENDAR2_RESPONSIVE_PANEL_FRAME_CLASSNAME } from "./mobile-layout";
import { PRIORITY_CONFIG, type TaskPriority } from "./calendar2-types";

interface Calendar2MonthViewProps {
  anchorDate: Date;
  days: Date[];
  eventsByDate: Record<string, CalendarEvent[]>;
  eventPriorities: Record<string, TaskPriority>;
  glowingCellKey: string | null;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (eventId: string) => void;
  onQuickAdd: (date: Date) => void;
  onMoveEvent: (eventId: string, payload: { date: string; time?: string }) => void | Promise<void>;
}

const MONTH_DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const EMPTY_DAY_EVENTS: CalendarEvent[] = [];

function getEventStyle(event: CalendarEvent, priorities?: Record<string, TaskPriority>) {
  return event.type === "event"
    ? "bg-[#1E3A8A20] border-[#3B82F6] text-[#93C5FD] rounded-[8px]" // Мягкий синий фон, синяя рамка, события не приоритизируются
    : "bg-[#2A2A2A] border-[#3A3A3A] text-[#E5E5E5] rounded-[6px]"; // Нейтральный серый фон для задач
}

/* ── Isolated month cell ── */

interface MonthCellProps {
  day: Date;
  dateKey: string;
  dayEvents: CalendarEvent[];
  eventPriorities: Record<string, TaskPriority>;
  isCurrentMonth: boolean;
  isCurrentDay: boolean;
  isToday: boolean;
  isGlowing: boolean;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (eventId: string) => void;
  onQuickAdd: (date: Date) => void;
  onMoveEvent: (eventId: string, payload: { date: string; time?: string }) => void | Promise<void>;
}

const MonthCell = React.memo(function MonthCell({
  day,
  dateKey,
  dayEvents,
  eventPriorities,
  isCurrentMonth,
  isCurrentDay,
  isToday,
  isGlowing,
  onSelectDate,
  onSelectEvent,
  onQuickAdd,
  onMoveEvent,
}: MonthCellProps) {
  const cellRef = useRef<HTMLDivElement>(null);
  const visibleEvents = dayEvents.slice(0, 3);
  const extraCount = dayEvents.length - visibleEvents.length;

  const bgClass = isCurrentDay
    ? "bg-[var(--cal2-accent-soft)]"
    : isCurrentMonth
      ? "bg-transparent hover:bg-[rgba(255,255,255,0.03)]"
      : "bg-[rgba(0,0,0,0.2)] hover:bg-[rgba(255,255,255,0.02)]";

  const markDragOver = useCallback(() => {
    const cell = cellRef.current;
    if (!cell) {
      return;
    }

    const activeTargets = document.querySelectorAll<HTMLElement>(
      ".cal2-drop-target[data-drag-over]",
    );
    for (const target of activeTargets) {
      if (target !== cell) {
        target.removeAttribute("data-drag-over");
      }
    }

    cell.setAttribute("data-drag-over", "true");
  }, []);

  const clearDragOver = useCallback(() => {
    cellRef.current?.removeAttribute("data-drag-over");
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    markDragOver();
  }, [markDragOver]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const related = event.relatedTarget as Node | null;
    if (related && cellRef.current?.contains(related)) {
      return;
    }
    clearDragOver();
  }, [clearDragOver]);

  return (
    <div
      ref={cellRef}
      onClick={() => onQuickAdd(day)}
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
        "cal2-drop-target group relative cursor-pointer border-b border-r border-[var(--cal2-border)] p-1.5 text-left last:border-r-0",
        bgClass,
        isGlowing ? "cal2-cell-drop-flash" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ contain: "layout style paint" }}
    >
      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectDate(day);
          }}
          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-[4px] px-1 text-[11px] font-semibold leading-[1] transition-colors ${
            isToday
              ? "border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent)] text-[var(--cal2-text-primary)]"
              : isCurrentMonth
                ? "text-[var(--cal2-text-primary)] hover:bg-[rgba(255,255,255,0.06)]"
                : "text-[var(--cal2-text-disabled)] hover:bg-[rgba(255,255,255,0.03)]"
          }`}
        >
          {format(day, "d")}
        </button>
        <span className="text-[10px] text-[var(--cal2-text-secondary)] opacity-0 transition-opacity group-hover:opacity-100">
          +
        </span>
      </div>

      <div className="space-y-0.5">
        {visibleEvents.map((event) => {
          return (
            <button
              key={event.id}
              type="button"
              draggable
              onDragStartCapture={(dragEvent) => {
                dragEvent.stopPropagation();
                dragEvent.dataTransfer.effectAllowed = "move";
                dragEvent.dataTransfer.setData("text/plain", event.id);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectEvent(event.id);
              }}
              className={`relative flex items-center w-full truncate border px-1.5 py-0.5 text-left text-[10px] font-medium leading-[1.2] transition-colors hover:brightness-110 ${getEventStyle(event)}`}
            >
              {event.type === "task" && eventPriorities[event.id] && (
                <div
                  className={`absolute left-0 top-0 bottom-0 w-[4px] rounded-l-sm ${PRIORITY_CONFIG[eventPriorities[event.id]].dot}`}
                />
              )}
              <div className={`flex w-full truncate ${event.type === "task" && eventPriorities[event.id] ? "ml-1" : ""}`}>
                {event.time && (
                  <span className="mr-1 text-[#9CA3AF]">{event.time}</span>
                )}
                <span className="truncate">{event.title}</span>
              </div>
            </button>
          );
        })}

        {extraCount > 0 && (
          <p className="px-1 text-[10px] font-medium text-[var(--cal2-text-secondary)]">
            +{extraCount}
          </p>
        )}
      </div>
    </div>
  );
});

/* ── Month view grid ── */

export default function Calendar2MonthView({
  anchorDate,
  days,
  eventsByDate,
  eventPriorities,
  glowingCellKey,
  onSelectDate,
  onSelectEvent,
  onQuickAdd,
  onMoveEvent,
}: Calendar2MonthViewProps) {
  const today = new Date();

  return (
    <div className={CALENDAR2_RESPONSIVE_PANEL_FRAME_CLASSNAME}>
      <div className="grid grid-cols-7 border-b border-[var(--cal2-border)] bg-[var(--cal2-surface-2)]">
        {MONTH_DAY_NAMES.map((name) => (
          <div
            key={name}
            className="border-r border-[var(--cal2-border)] px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)] last:border-r-0"
          >
            {name}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 grid-rows-[repeat(6,minmax(100px,1fr))] md:grid-rows-[repeat(6,minmax(120px,1fr))]">
        {days.map((day) => {
          const dateKey = toDateKey(day);
          const dayEvents = eventsByDate[dateKey] ?? EMPTY_DAY_EVENTS;

          return (
            <MonthCell
              key={dateKey}
              day={day}
              dateKey={dateKey}
              dayEvents={dayEvents}
              eventPriorities={eventPriorities}
              isCurrentMonth={isSameMonth(day, anchorDate)}
              isCurrentDay={isSameDay(day, anchorDate)}
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
  );
}
