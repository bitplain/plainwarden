"use client";

import React from "react";
import { format, isSameDay, isSameMonth } from "date-fns";
import { motion } from "motion/react";
import type { CalendarEvent } from "@/lib/types";
import { toDateKey } from "@/components/calendar2/date-utils";
import { PRIORITY_CONFIG, type TaskPriority } from "./calendar2-types";
import { BOUNCE_SPRING } from "./bounce-spring";

interface Calendar2MonthViewProps {
  anchorDate: Date;
  days: Date[];
  eventsByDate: Record<string, CalendarEvent[]>;
  eventPriorities: Record<string, TaskPriority>;
  bouncingEventId: string | null;
  glowingCellKey: string | null;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (eventId: string) => void;
  onQuickAdd: (date: Date) => void;
  onMoveEvent: (eventId: string, payload: { date: string; time?: string }) => void | Promise<void>;
}

const MONTH_DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function getEventStyle(event: CalendarEvent, priorities: Record<string, TaskPriority>) {
  const priority = priorities[event.id];
  if (priority) {
    const config = PRIORITY_CONFIG[priority];
    return `${config.bg} ${config.border} ${config.color}`;
  }
  return event.type === "event"
    ? "bg-[var(--cal2-accent-soft)] border-[rgba(94,106,210,0.4)] text-[#d6dbff]"
    : "bg-[rgba(255,255,255,0.06)] border-[var(--cal2-border)] text-[var(--cal2-text-primary)]";
}

/* ── Isolated month cell ── */

interface MonthCellProps {
  day: Date;
  dateKey: string;
  dayEvents: CalendarEvent[];
  eventPriorities: Record<string, TaskPriority>;
  bouncingEventId: string | null;
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
  bouncingEventId,
  isCurrentMonth,
  isCurrentDay,
  isToday,
  isGlowing,
  onSelectDate,
  onSelectEvent,
  onQuickAdd,
  onMoveEvent,
}: MonthCellProps) {
  const visibleEvents = dayEvents.slice(0, 3);
  const extraCount = dayEvents.length - visibleEvents.length;

  const bgClass = isCurrentDay
    ? "bg-[var(--cal2-accent-soft)]"
    : isCurrentMonth
      ? "bg-transparent hover:bg-[rgba(255,255,255,0.03)]"
      : "bg-[rgba(0,0,0,0.2)] hover:bg-[rgba(255,255,255,0.02)]";

  return (
    <div
      onClick={() => onQuickAdd(day)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const draggedEventId = e.dataTransfer.getData("text/plain");
        if (draggedEventId) {
          void onMoveEvent(draggedEventId, { date: dateKey });
        }
      }}
      className={[
        "group relative cursor-pointer border-b border-r border-[var(--cal2-border)] p-1.5 text-left transition-colors last:border-r-0",
        bgClass,
        isGlowing ? "cal2-cell-drop-trace" : "",
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
          const isBouncing = bouncingEventId === event.id;
          return (
            <motion.button
              key={event.id}
              type="button"
              draggable
              animate={
                isBouncing
                  ? { y: [0, -6, 0], scale: [1, 1.04, 1] }
                  : undefined
              }
              transition={isBouncing ? BOUNCE_SPRING : undefined}
              {...({
                onDragStartCapture: (dragEvent: React.DragEvent) => {
                  dragEvent.stopPropagation();
                  dragEvent.dataTransfer.effectAllowed = "move";
                  dragEvent.dataTransfer.setData("text/plain", event.id);
                },
              } as Record<string, unknown>)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectEvent(event.id);
              }}
              className={`w-full truncate rounded-[4px] border px-1.5 py-0.5 text-left text-[10px] font-medium leading-[1.2] transition-colors hover:bg-[rgba(255,255,255,0.12)] ${getEventStyle(event, eventPriorities)}${
                isBouncing ? " ring-1 ring-[var(--cal2-accent)] shadow-[0_0_12px_rgba(94,106,210,0.35)]" : ""
              }`}
            >
              {event.time && (
                <span className="mr-1 text-[var(--cal2-text-secondary)]">{event.time}</span>
              )}
              {event.title}
            </motion.button>
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
  bouncingEventId,
  glowingCellKey,
  onSelectDate,
  onSelectEvent,
  onQuickAdd,
  onMoveEvent,
}: Calendar2MonthViewProps) {
  const today = new Date();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)]">
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
          const dayEvents = eventsByDate[dateKey] ?? [];

          return (
            <MonthCell
              key={dateKey}
              day={day}
              dateKey={dateKey}
              dayEvents={dayEvents}
              eventPriorities={eventPriorities}
              bouncingEventId={bouncingEventId}
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
