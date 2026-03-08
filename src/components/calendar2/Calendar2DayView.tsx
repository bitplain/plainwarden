"use client";

import React, { useCallback, useMemo, useRef } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { CalendarEvent } from "@/lib/types";
import {
  DAY_VIEW_END_HOUR,
  DAY_VIEW_START_HOUR,
  getDaySlots,
} from "@/components/calendar2/date-utils";
import { CALENDAR2_RESPONSIVE_PANEL_FRAME_CLASSNAME } from "./mobile-layout";
import { PRIORITY_CONFIG, type TaskPriority } from "./calendar2-types";

const EMPTY_SLOT_EVENTS: CalendarEvent[] = [];

interface Calendar2DayViewProps {
  dayDate: Date;
  dayEvents: CalendarEvent[];
  eventPriorities: Record<string, TaskPriority>;
  glowingCellKey: string | null;
  onSelectEvent: (eventId: string) => void;
  onMoveEvent: (eventId: string, payload: { date: string; time?: string }) => void | Promise<void>;
}

function getEventHour(event: CalendarEvent): number | null {
  if (!event.time) {
    return null;
  }
  const [hours] = event.time.split(":");
  const parsed = Number(hours);
  return Number.isFinite(parsed) ? parsed : null;
}

function getEventStyle(event: CalendarEvent, priorities?: Record<string, TaskPriority>) {
  return event.type === "event"
    ? "bg-[#1E3A8A20] border-[#3B82F6] text-[#93C5FD] rounded-[8px]" // Мягкий синий фон, событие
    : "bg-[#2A2A2A] border-[#3A3A3A] text-[#E5E5E5] rounded-[6px]"; // Нейтральный фон, задача
}

/* ── Isolated day-view time slot ── */

interface DayTimeSlotProps {
  slot: Date;
  dayDateKey: string;
  slotEvents: CalendarEvent[];
  eventPriorities: Record<string, TaskPriority>;
  isGlowing: boolean;
  onSelectEvent: (eventId: string) => void;
  onMoveEvent: (eventId: string, payload: { date: string; time?: string }) => void | Promise<void>;
}

const DayTimeSlot = React.memo(function DayTimeSlot({
  slot,
  dayDateKey,
  slotEvents,
  eventPriorities,
  isGlowing,
  onSelectEvent,
  onMoveEvent,
}: DayTimeSlotProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const timeStr = format(slot, "HH:mm");
  const markDragOver = useCallback(() => {
    const slotEl = slotRef.current;
    if (!slotEl) {
      return;
    }

    const activeTargets = document.querySelectorAll<HTMLElement>(
      ".cal2-drop-target[data-drag-over]",
    );
    for (const target of activeTargets) {
      if (target !== slotEl) {
        target.removeAttribute("data-drag-over");
      }
    }

    slotEl.setAttribute("data-drag-over", "true");
  }, []);

  const clearDragOver = useCallback(() => {
    slotRef.current?.removeAttribute("data-drag-over");
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    markDragOver();
  }, [markDragOver]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const related = event.relatedTarget as Node | null;
    if (related && slotRef.current?.contains(related)) {
      return;
    }
    clearDragOver();
  }, [clearDragOver]);

  return (
    <div
      ref={slotRef}
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
          void onMoveEvent(draggedEventId, {
            date: dayDateKey,
            time: timeStr,
          });
        }
      }}
      className={[
        "cal2-drop-target relative grid grid-cols-[60px_1fr] items-start gap-3 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2 py-2 sm:px-3",
        isGlowing ? "cal2-cell-drop-flash" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ contain: "layout style paint" }}
    >
      <div className="pt-1 text-[11px] font-medium text-[var(--cal2-text-secondary)]">
        {timeStr}
      </div>
      <div className="space-y-1.5">
        {slotEvents.length === 0 && (
          <p className="rounded-[4px] border border-dashed border-[var(--cal2-border)] px-2 py-2 text-[11px] text-[var(--cal2-text-disabled)]">
            Свободно
          </p>
        )}

        {slotEvents.map((event) => {
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
              className={`relative flex flex-col w-full border px-3 py-2 text-left transition-colors hover:brightness-110 transition-colors hover:brightness-110 ${getEventStyle(event)}`}
            >
              {event.type === "task" && eventPriorities[event.id] && (
                <div
                  className={`absolute left-0 top-0 bottom-0 w-[4px] rounded-l-[5px] ${PRIORITY_CONFIG[eventPriorities[event.id]].dot}`}
                />
              )}
              <div className={`w-full ${event.type === "task" && eventPriorities[event.id] ? "ml-1.5" : ""}`}>
                <p className="text-[10px] text-[#9CA3AF] opacity-80">{event.time ?? "--:--"}</p>
                <p className="text-[13px] font-medium leading-[1.2]">{event.title}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

/* ── Event list for unscheduled / outside-grid sections ── */

interface DayEventCardProps {
  event: CalendarEvent;
  eventPriorities: Record<string, TaskPriority>;
  showTime: boolean;
  onSelectEvent: (eventId: string) => void;
}

const DayEventCard = React.memo(function DayEventCard({
  event,
  eventPriorities,
  showTime,
  onSelectEvent,
}: DayEventCardProps) {
  return (
    <button
      type="button"
      draggable
      onDragStartCapture={(dragEvent) => {
        dragEvent.dataTransfer.effectAllowed = "move";
        dragEvent.dataTransfer.setData("text/plain", event.id);
      }}
      onClick={() => onSelectEvent(event.id)}
      className={`relative flex flex-col w-full border px-3 py-2 text-left transition-colors hover:brightness-110 ${getEventStyle(event)}`}
    >
      {event.type === "task" && eventPriorities[event.id] && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-[4px] rounded-l-[5px] ${PRIORITY_CONFIG[eventPriorities[event.id]].dot}`}
        />
      )}
      <div className={`w-full ${event.type === "task" && eventPriorities[event.id] ? "ml-1.5" : ""}`}>
        {showTime && (
          <p className="text-[10px] text-[#9CA3AF] opacity-80">{event.time ?? "--:--"}</p>
        )}
        <p className="text-[13px] font-medium leading-[1.2]">{event.title}</p>
      </div>
    </button>
  );
});

/* ── Day view ── */

export default function Calendar2DayView({
  dayDate,
  dayEvents,
  eventPriorities,
  glowingCellKey,
  onSelectEvent,
  onMoveEvent,
}: Calendar2DayViewProps) {
  const slots = useMemo(() => getDaySlots(dayDate), [dayDate]);
  const { slottedEvents, unscheduledEvents, outsideGridEvents } = useMemo(() => {
    const byHour = new Map<number, CalendarEvent[]>();
    const unscheduled: CalendarEvent[] = [];
    const outsideGrid: CalendarEvent[] = [];

    for (const event of dayEvents) {
      const hour = getEventHour(event);
      if (hour === null) {
        unscheduled.push(event);
      } else if (hour < DAY_VIEW_START_HOUR || hour > DAY_VIEW_END_HOUR) {
        outsideGrid.push(event);
      } else {
        const list = byHour.get(hour) ?? [];
        list.push(event);
        byHour.set(hour, list);
      }
    }

    return {
      slottedEvents: byHour,
      unscheduledEvents: unscheduled,
      outsideGridEvents: outsideGrid,
    };
  }, [dayEvents]);

  const dayDateKey = format(dayDate, "yyyy-MM-dd");

  return (
    <div className={CALENDAR2_RESPONSIVE_PANEL_FRAME_CLASSNAME}>
      <div className="border-b border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-4 py-3">
        <p className="text-[13px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)]">
          {format(dayDate, "EEEE, d MMMM", { locale: ru })}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
        {dayEvents.length === 0 && (
          <div className="rounded-[6px] border border-dashed border-[var(--cal2-border)] p-4 text-[12px] text-[var(--cal2-text-secondary)]">
            На этот день пока нет событий.
          </div>
        )}

        {unscheduledEvents.length > 0 && (
          <section className="mb-4 rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-3">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
              Без времени
            </h3>
            <div className="space-y-1.5">
              {unscheduledEvents.map((event) => (
                <DayEventCard
                  key={event.id}
                  event={event}
                  eventPriorities={eventPriorities}
                  showTime={false}
                  onSelectEvent={onSelectEvent}
                />
              ))}
            </div>
          </section>
        )}

        {outsideGridEvents.length > 0 && (
          <section className="mb-4 rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-3">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
              Вне сетки 08:00–21:00
            </h3>
            <div className="space-y-1.5">
              {outsideGridEvents.map((event) => (
                <DayEventCard
                  key={event.id}
                  event={event}
                  eventPriorities={eventPriorities}
                  showTime
                  onSelectEvent={onSelectEvent}
                />
              ))}
            </div>
          </section>
        )}

        <section className="space-y-1.5">
          {slots.map((slot) => {
            const hour = Number(format(slot, "H"));
            const slotEvents = slottedEvents.get(hour) ?? EMPTY_SLOT_EVENTS;
            const timeStr = format(slot, "HH:mm");

            return (
              <DayTimeSlot
                key={slot.toISOString()}
                slot={slot}
                dayDateKey={dayDateKey}
                slotEvents={slotEvents}
                eventPriorities={eventPriorities}
                isGlowing={glowingCellKey === `${dayDateKey}T${timeStr}`}
                onSelectEvent={onSelectEvent}
                onMoveEvent={onMoveEvent}
              />
            );
          })}
        </section>
      </div>
    </div>
  );
}
