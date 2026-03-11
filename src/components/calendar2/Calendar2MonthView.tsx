"use client";

import React, { useCallback, useRef } from "react";
import { format, isSameDay, isSameMonth } from "date-fns";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { formatMonthShort, toDateKey } from "@/components/calendar2/date-utils";
import type { CalendarEvent } from "@/lib/types";
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

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getEventStyle(event: CalendarEvent) {
  return event.type === "event"
    ? "border-[rgba(91,124,255,0.28)] bg-[rgba(52,75,164,0.18)] text-[#D9E1FF]"
    : "border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)] text-[#E7E7EA]";
}

function getMonthWeekdayLabel(date: Date) {
  return MONTH_DAY_NAMES[(date.getDay() + 6) % 7];
}

type MonthCellTone = "default" | "muted" | "active";

function getMonthCellTone(input: {
  isCurrentMonth: boolean;
  isCurrentDay: boolean;
  isToday: boolean;
  isGlowing: boolean;
}): MonthCellTone {
  if (input.isCurrentDay || input.isToday || input.isGlowing) {
    return "active";
  }

  if (!input.isCurrentMonth) {
    return "muted";
  }

  return "default";
}

function getMonthCellSurfaceClass(tone: MonthCellTone) {
  switch (tone) {
    case "active":
      return "border-[rgba(126,141,255,0.36)] [background-image:var(--cal2-month-card-active)] [box-shadow:var(--cal2-month-shadow-active)]";
    case "muted":
      return "border-[rgba(255,255,255,0.04)] [background-image:var(--cal2-month-card-muted)] [box-shadow:var(--cal2-month-shadow)]";
    default:
      return "border-[rgba(255,255,255,0.07)] [background-image:var(--cal2-month-card)] [box-shadow:var(--cal2-month-shadow)]";
  }
}

function getDateButtonClass(input: {
  isToday: boolean;
  isCurrentMonth: boolean;
  isCurrentDay: boolean;
}) {
  if (input.isToday || input.isCurrentDay) {
    return "border border-[rgba(148,163,255,0.38)] bg-[rgba(94,106,210,0.18)] text-[var(--cal2-text-primary)]";
  }

  if (input.isCurrentMonth) {
    return "text-[var(--cal2-text-primary)] hover:bg-[rgba(255,255,255,0.06)]";
  }

  return "text-[var(--cal2-text-secondary)] hover:bg-[rgba(255,255,255,0.04)]";
}

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
  const tone = getMonthCellTone({
    isCurrentMonth,
    isCurrentDay,
    isToday,
    isGlowing,
  });
  const glowActive = tone === "active";

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
    <div className="min-h-0">
      <div
        ref={cellRef}
        data-cal2-month-cell-tone={tone}
        onClick={() => onQuickAdd(day)}
        onDragEnter={handleDragEnter}
        onDragOver={(event) => {
          event.preventDefault();
          markDragOver();
        }}
        onDragLeave={handleDragLeave}
        onDrop={(event) => {
          event.preventDefault();
          clearDragOver();
          const draggedEventId = event.dataTransfer.getData("text/plain");
          if (draggedEventId) {
            void onMoveEvent(draggedEventId, { date: dateKey });
          }
        }}
        className={cn(
          "cal2-drop-target group/calcell relative flex h-full min-h-[112px] cursor-pointer flex-col overflow-hidden rounded-[18px] border p-3 text-left transition duration-200 ease-out md:min-h-[132px]",
          "hover:-translate-y-[1px] hover:[background-image:var(--cal2-month-card-hover)]",
          getMonthCellSurfaceClass(tone),
          isGlowing && "cal2-cell-drop-flash",
        )}
        style={{ contain: "layout style paint" }}
      >
        <GlowingEffect active={glowActive} />

        <div className="relative z-[1] mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--cal2-text-secondary)]">
              {getMonthWeekdayLabel(day)}
            </span>
            {!isCurrentMonth ? (
              <span className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--cal2-text-disabled)]">
                {formatMonthShort(day)}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelectDate(day);
            }}
            className={cn(
              "inline-flex h-8 min-w-8 items-center justify-center rounded-[10px] px-2 text-[12px] font-semibold leading-none transition-colors",
              getDateButtonClass({ isToday, isCurrentMonth, isCurrentDay }),
            )}
          >
            {format(day, "d")}
          </button>
        </div>

        <div className="relative z-[1] flex flex-1 flex-col justify-between gap-2">
          <div className="space-y-1.5">
            {visibleEvents.map((event) => {
              const priority = eventPriorities[event.id];
              const hasPriority = event.type === "task" && Boolean(priority);

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
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onSelectEvent(event.id);
                  }}
                  className={cn(
                    "relative flex w-full items-center gap-1.5 overflow-hidden rounded-[10px] border px-2 py-1.5 text-left text-[10px] font-medium leading-[1.25] transition duration-150 ease-out hover:brightness-110",
                    getEventStyle(event),
                  )}
                >
                  {hasPriority ? (
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 w-[4px] rounded-l-[10px]",
                        PRIORITY_CONFIG[priority].dot,
                      )}
                    />
                  ) : null}

                  {event.time ? (
                    <span className={cn(
                      "shrink-0 text-[9px] uppercase tracking-[0.12em] text-[#9CA3AF]",
                      hasPriority && "ml-1",
                    )}>
                      {event.time}
                    </span>
                  ) : null}

                  <span className={cn("truncate", hasPriority && !event.time && "ml-1")}>
                    {event.title}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2">
            {extraCount > 0 ? (
              <p className="text-[10px] font-medium text-[var(--cal2-text-secondary)]">
                +{extraCount}
              </p>
            ) : (
              <span className="text-[10px] text-[var(--cal2-text-disabled)]">
                {dayEvents.length === 0 ? "Свободно" : "\u00A0"}
              </span>
            )}

            <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--cal2-text-disabled)] opacity-0 transition-opacity group-hover/calcell:opacity-100">
              Добавить
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

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
      <div className="grid grid-cols-7 gap-3 px-3 pb-2 pt-3 md:px-4">
        {MONTH_DAY_NAMES.map((name) => (
          <div
            key={name}
            className="rounded-[12px] border border-[var(--cal2-border-subtle)] bg-[rgba(255,255,255,0.02)] px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cal2-text-secondary)]"
          >
            {name}
          </div>
        ))}
      </div>

      <div
        data-cal2-month-grid="detached"
        className="grid flex-1 grid-cols-7 grid-rows-[repeat(6,minmax(112px,1fr))] gap-3 overflow-hidden px-3 pb-3 md:grid-rows-[repeat(6,minmax(132px,1fr))] md:px-4"
      >
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
