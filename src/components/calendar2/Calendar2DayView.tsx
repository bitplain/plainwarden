"use client";

import React from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { motion } from "motion/react";
import type { CalendarEvent } from "@/lib/types";
import {
  DAY_VIEW_END_HOUR,
  DAY_VIEW_START_HOUR,
  getDaySlots,
} from "@/components/calendar2/date-utils";
import { PRIORITY_CONFIG, type TaskPriority } from "./calendar2-types";
import { BOUNCE_SPRING } from "./bounce-spring";

interface Calendar2DayViewProps {
  dayDate: Date;
  dayEvents: CalendarEvent[];
  eventPriorities: Record<string, TaskPriority>;
  bouncingEventId: string | null;
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

/* ── Isolated day-view time slot ── */

interface DayTimeSlotProps {
  slot: Date;
  dayDateKey: string;
  slotEvents: CalendarEvent[];
  eventPriorities: Record<string, TaskPriority>;
  bouncingEventId: string | null;
  isGlowing: boolean;
  onSelectEvent: (eventId: string) => void;
  onMoveEvent: (eventId: string, payload: { date: string; time?: string }) => void | Promise<void>;
}

const DayTimeSlot = React.memo(function DayTimeSlot({
  slot,
  dayDateKey,
  slotEvents,
  eventPriorities,
  bouncingEventId,
  isGlowing,
  onSelectEvent,
  onMoveEvent,
}: DayTimeSlotProps) {
  const timeStr = format(slot, "HH:mm");

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const draggedEventId = e.dataTransfer.getData("text/plain");
        if (draggedEventId) {
          void onMoveEvent(draggedEventId, {
            date: dayDateKey,
            time: timeStr,
          });
        }
      }}
      className={[
        "relative grid grid-cols-[60px_1fr] items-start gap-3 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2 py-2 sm:px-3",
        isGlowing ? "cal2-cell-drop-trace" : "",
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
                  dragEvent.dataTransfer.effectAllowed = "move";
                  dragEvent.dataTransfer.setData("text/plain", event.id);
                },
              } as Record<string, unknown>)}
              onClick={() => onSelectEvent(event.id)}
              className={`w-full rounded-[6px] border px-3 py-2 text-left transition-colors hover:bg-[rgba(255,255,255,0.1)] ${getEventStyle(event, eventPriorities)}${
                isBouncing ? " ring-1 ring-[var(--cal2-accent)] shadow-[0_0_12px_rgba(94,106,210,0.35)]" : ""
              }`}
            >
              <p className="text-[10px] text-[var(--cal2-text-secondary)]">{event.time ?? "--:--"}</p>
              <p className="text-[13px] font-medium leading-[1.2]">{event.title}</p>
            </motion.button>
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
  isBouncing: boolean;
  showTime: boolean;
  onSelectEvent: (eventId: string) => void;
}

const DayEventCard = React.memo(function DayEventCard({
  event,
  eventPriorities,
  isBouncing,
  showTime,
  onSelectEvent,
}: DayEventCardProps) {
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
          dragEvent.dataTransfer.effectAllowed = "move";
          dragEvent.dataTransfer.setData("text/plain", event.id);
        },
      } as Record<string, unknown>)}
      onClick={() => onSelectEvent(event.id)}
      className={`w-full rounded-[6px] border px-3 py-2 text-left transition-colors hover:bg-[rgba(255,255,255,0.1)] ${getEventStyle(event, eventPriorities)}${
        isBouncing ? " ring-1 ring-[var(--cal2-accent)] shadow-[0_0_12px_rgba(94,106,210,0.35)]" : ""
      }`}
    >
      {showTime && (
        <p className="text-[10px] text-[var(--cal2-text-secondary)]">{event.time ?? "--:--"}</p>
      )}
      <p className="text-[13px] font-medium leading-[1.2]">{event.title}</p>
    </motion.button>
  );
});

/* ── Day view ── */

export default function Calendar2DayView({
  dayDate,
  dayEvents,
  eventPriorities,
  bouncingEventId,
  glowingCellKey,
  onSelectEvent,
  onMoveEvent,
}: Calendar2DayViewProps) {
  const slots = getDaySlots(dayDate);
  const slottedEvents = new Map<number, CalendarEvent[]>();
  const unscheduledEvents: CalendarEvent[] = [];
  const outsideGridEvents: CalendarEvent[] = [];

  for (const event of dayEvents) {
    const hour = getEventHour(event);
    if (hour === null) {
      unscheduledEvents.push(event);
    } else if (hour < DAY_VIEW_START_HOUR || hour > DAY_VIEW_END_HOUR) {
      outsideGridEvents.push(event);
    } else {
      const list = slottedEvents.get(hour) ?? [];
      list.push(event);
      slottedEvents.set(hour, list);
    }
  }

  const dayDateKey = format(dayDate, "yyyy-MM-dd");

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)]">
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
                  isBouncing={bouncingEventId === event.id}
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
                  isBouncing={bouncingEventId === event.id}
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
            const slotEvents = slottedEvents.get(hour) ?? [];
            const timeStr = format(slot, "HH:mm");

            return (
              <DayTimeSlot
                key={slot.toISOString()}
                slot={slot}
                dayDateKey={dayDateKey}
                slotEvents={slotEvents}
                eventPriorities={eventPriorities}
                bouncingEventId={bouncingEventId}
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
