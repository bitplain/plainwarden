"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { CalendarEvent } from "@/lib/types";
import { toDateKey } from "@/components/calendar/date-utils";
import type { TimeBlock } from "./calendar2-types";

interface DailyPlannerProps {
  anchorDate: Date;
  events: CalendarEvent[];
  timeBlocks: TimeBlock[];
  onAddTimeBlock: (input: Omit<TimeBlock, "id">) => void;
  onDeleteTimeBlock: (id: string) => void;
  onSelectEvent: (eventId: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

interface TimeBlockFormData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  recurringDays: number[];
}

const EMPTY_FORM: TimeBlockFormData = {
  title: "",
  description: "",
  startTime: "09:00",
  endTime: "10:00",
  isRecurring: false,
  recurringDays: [],
};

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export default function DailyPlanner({
  anchorDate,
  events,
  timeBlocks,
  onAddTimeBlock,
  onDeleteTimeBlock,
  onSelectEvent,
}: DailyPlannerProps) {
  const dateKey = toDateKey(anchorDate);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TimeBlockFormData>({ ...EMPTY_FORM });
  const [formError, setFormError] = useState<string | null>(null);

  const dayOfWeek = anchorDate.getDay();

  const dayTimeBlocks = timeBlocks.filter((block) => {
    if (block.date === dateKey) {
      return true;
    }
    if (block.isRecurring && block.recurringDays?.includes(dayOfWeek)) {
      return true;
    }
    return false;
  });

  const dayEvents = events.filter((e) => e.date === dateKey);

  const getBlocksForHour = (hour: number) => {
    return dayTimeBlocks.filter((block) => {
      const startH = parseInt(block.startTime.split(":")[0], 10);
      const endH = parseInt(block.endTime.split(":")[0], 10);
      return hour >= startH && hour < endH;
    });
  };

  const getEventsForHour = (hour: number) => {
    return dayEvents.filter((event) => {
      if (!event.time) {
        return false;
      }
      const eventH = parseInt(event.time.split(":")[0], 10);
      return eventH === hour;
    });
  };

  const handleSubmit = () => {
    setFormError(null);

    if (!form.title.trim()) {
      setFormError("Укажите название блока");
      return;
    }

    if (form.startTime >= form.endTime) {
      setFormError("Время начала должно быть раньше времени окончания");
      return;
    }

    onAddTimeBlock({
      date: dateKey,
      startTime: form.startTime,
      endTime: form.endTime,
      title: form.title.trim(),
      description: form.description.trim(),
      isRecurring: form.isRecurring,
      recurringDays: form.isRecurring ? form.recurringDays : undefined,
    });

    setForm({ ...EMPTY_FORM });
    setShowForm(false);
  };

  const toggleRecurringDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(day)
        ? prev.recurringDays.filter((d) => d !== day)
        : [...prev.recurringDays, day],
    }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#12122a]/40">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#16162a]/40 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-zinc-100">
            {format(anchorDate, "EEEE, d MMMM", { locale: ru })}
          </p>
          <p className="text-xs text-zinc-500">Ежедневник</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg border border-indigo-400/30 bg-indigo-500/15 px-3 py-1.5 text-xs font-medium text-indigo-200 transition-colors hover:bg-indigo-500/25"
        >
          {showForm ? "Отмена" : "+ Блок"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Add time block form */}
        {showForm && (
          <div className="border-b border-white/[0.06] bg-[#16162a]/30 p-4">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Название блока"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="h-9 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-indigo-400/30"
              />

              <textarea
                placeholder="Описание (опционально)"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="min-h-16 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-indigo-400/30"
              />

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-xs text-zinc-500">Начало</span>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    className="h-9 rounded-lg border border-white/[0.08] bg-black/30 px-3 text-sm text-zinc-100 outline-none focus:border-indigo-400/30"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-zinc-500">Конец</span>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="h-9 rounded-lg border border-white/[0.08] bg-black/30 px-3 text-sm text-zinc-100 outline-none focus:border-indigo-400/30"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => setForm((prev) => ({ ...prev, isRecurring: e.target.checked }))}
                  className="accent-indigo-500"
                />
                <span className="text-sm text-zinc-300">Повторяющийся</span>
              </label>

              {form.isRecurring && (
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_NAMES.map((name, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleRecurringDay(index)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        form.recurringDays.includes(index)
                          ? "bg-indigo-500/25 text-indigo-200 border border-indigo-400/30"
                          : "bg-white/[0.04] text-zinc-500 border border-white/[0.06] hover:text-zinc-300"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}

              {formError && (
                <p className="text-xs text-red-300">{formError}</p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                className="w-full rounded-lg border border-indigo-400/30 bg-indigo-500/20 py-2 text-sm font-medium text-indigo-200 transition-colors hover:bg-indigo-500/30"
              >
                Создать блок
              </button>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="px-3 py-2 sm:px-4">
          {HOURS.map((hour) => {
            const blocks = getBlocksForHour(hour);
            const hourEvents = getEventsForHour(hour);
            const hasContent = blocks.length > 0 || hourEvents.length > 0;

            return (
              <div
                key={hour}
                className={`grid grid-cols-[52px_1fr] gap-3 border-b border-white/[0.04] py-1.5 ${
                  hasContent ? "min-h-[52px]" : "min-h-[36px]"
                }`}
              >
                <div className="pt-1 text-xs font-medium text-zinc-600">
                  {formatHour(hour)}
                </div>
                <div className="space-y-1">
                  {blocks.map((block) => {
                    const startH = parseInt(block.startTime.split(":")[0], 10);
                    if (startH !== hour) {
                      return null;
                    }

                    return (
                      <div
                        key={block.id}
                        className="flex items-start justify-between rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1.5"
                      >
                        <div>
                          <p className="text-sm font-medium text-indigo-200">{block.title}</p>
                          <p className="text-[11px] text-indigo-300/60">
                            {block.startTime} — {block.endTime}
                            {block.isRecurring && " · ↻"}
                          </p>
                          {block.description && (
                            <p className="mt-1 text-xs text-zinc-400">{block.description}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteTimeBlock(block.id)}
                          className="ml-2 text-xs text-zinc-500 transition-colors hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}

                  {hourEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent(event.id)}
                      className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors hover:brightness-125 ${
                        event.type === "event"
                          ? "border-sky-400/25 bg-sky-500/12 text-sky-200"
                          : "border-violet-400/25 bg-violet-500/12 text-violet-200"
                      }`}
                    >
                      <p className="text-[11px] text-white/40">{event.time}</p>
                      <p className="text-sm font-medium">{event.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
