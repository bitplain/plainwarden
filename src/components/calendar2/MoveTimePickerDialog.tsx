"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, parse } from "date-fns";
import { ru } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import type { CalendarEvent } from "@/lib/types";

export interface MoveTimePickerRequest {
  /** The event being moved */
  event: CalendarEvent;
  /** Target date key (yyyy-MM-dd) */
  targetDate: string;
  /** Pre-filled time (from day-view slot drop) */
  suggestedTime?: string;
}

export interface MoveTimePickerResult {
  eventId: string;
  date: string;
  time?: string;
}

interface MoveTimePickerDialogProps {
  request: MoveTimePickerRequest | null;
  onConfirm: (result: MoveTimePickerResult) => void;
  onCancel: () => void;
}

function formatDateLabel(dateKey: string): string {
  try {
    const date = parse(dateKey, "yyyy-MM-dd", new Date());
    return format(date, "EEEE, d MMMM", { locale: ru });
  } catch {
    return dateKey;
  }
}

const TIME_PRESETS = [
  "09:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
];

export default function MoveTimePickerDialog({
  request,
  onConfirm,
  onCancel,
}: MoveTimePickerDialogProps) {
  const [time, setTime] = useState("");
  const [keepOriginal, setKeepOriginal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when request changes
  useEffect(() => {
    if (request) {
      const suggested = request.suggestedTime ?? request.event.time ?? "";
      setTime(suggested);
      setKeepOriginal(false);
      // Auto-focus after animation
      const timer = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [request]);

  const handleConfirm = useCallback(() => {
    if (!request) return;

    const finalTime = keepOriginal
      ? request.event.time
      : time.trim() || undefined;

    onConfirm({
      eventId: request.event.id,
      date: request.targetDate,
      time: finalTime,
    });
  }, [request, time, keepOriginal, onConfirm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [handleConfirm, onCancel],
  );

  return (
    <AnimatePresence>
      {request && (
        <motion.div
          key="move-time-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]"
          onClick={onCancel}
        >
          <motion.div
            key="move-time-card"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 28,
              mass: 0.9,
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
            className="w-full max-w-[340px] overflow-hidden rounded-xl border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.7)]"
          >
            {/* Accent stripe */}
            <div className="h-[2px] w-full bg-gradient-to-r from-[var(--cal2-accent)] via-[#7c6fe0] to-[var(--cal2-accent)]" />

            <div className="p-5">
              {/* Header */}
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--cal2-accent-soft)] text-[12px]">
                  ⏱
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--cal2-text-primary)]">
                    Перемеcтить событие
                  </h3>
                  <p className="mt-0.5 truncate text-[11px] text-[var(--cal2-text-secondary)]">
                    {request.event.title}
                  </p>
                </div>
              </div>

              {/* Target date badge */}
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2">
                <span className="text-[11px] text-[var(--cal2-text-secondary)]">→</span>
                <span className="text-[12px] font-medium capitalize text-[var(--cal2-text-primary)]">
                  {formatDateLabel(request.targetDate)}
                </span>
              </div>

              {/* Time input */}
              <div className="mb-3">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cal2-text-secondary)]">
                  Время
                </label>
                <input
                  ref={inputRef}
                  type="time"
                  value={keepOriginal ? (request.event.time ?? "") : time}
                  disabled={keepOriginal}
                  onChange={(e) => {
                    setKeepOriginal(false);
                    setTime(e.target.value);
                  }}
                  className="w-full rounded-lg border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2 text-[13px] text-[var(--cal2-text-primary)] outline-none transition-colors placeholder:text-[var(--cal2-text-disabled)] focus:border-[var(--cal2-accent)] disabled:opacity-40"
                />
              </div>

              {/* Quick time presets */}
              <div className="mb-4 flex flex-wrap gap-1.5">
                {TIME_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setKeepOriginal(false);
                      setTime(preset);
                    }}
                    className={`rounded-md border px-2 py-1 text-[10px] font-medium transition-all ${
                      !keepOriginal && time === preset
                        ? "border-[var(--cal2-accent)] bg-[var(--cal2-accent-soft)] text-[var(--cal2-accent)]"
                        : "border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] text-[var(--cal2-text-secondary)] hover:border-[rgba(255,255,255,0.14)] hover:text-[var(--cal2-text-primary)]"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Keep original time checkbox */}
              {request.event.time && (
                <label className="mb-4 flex cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2.5 transition-colors hover:border-[rgba(255,255,255,0.12)]">
                  <input
                    type="checkbox"
                    checked={keepOriginal}
                    onChange={(e) => setKeepOriginal(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[var(--cal2-border)] accent-[var(--cal2-accent)]"
                  />
                  <span className="text-[12px] text-[var(--cal2-text-primary)]">
                    Оставить текущее время ({request.event.time})
                  </span>
                </label>
              )}

              {/* Clear time option (no time) */}
              <button
                type="button"
                onClick={() => {
                  setKeepOriginal(false);
                  setTime("");
                }}
                className={`mb-4 w-full rounded-lg border px-3 py-2 text-left text-[12px] transition-all ${
                  !keepOriginal && time === ""
                    ? "border-[var(--cal2-accent)] bg-[var(--cal2-accent-soft)] text-[var(--cal2-accent)]"
                    : "border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] text-[var(--cal2-text-secondary)] hover:border-[rgba(255,255,255,0.12)] hover:text-[var(--cal2-text-primary)]"
                }`}
              >
                Без времени
              </button>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 rounded-lg border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2 text-[12px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--cal2-text-primary)]"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 rounded-lg border border-[rgba(94,106,210,0.4)] bg-[var(--cal2-accent)] px-3 py-2 text-[12px] font-semibold text-white shadow-[0_1px_4px_rgba(94,106,210,0.3)] transition-all hover:bg-[var(--cal2-accent-hover)] hover:shadow-[0_2px_8px_rgba(94,106,210,0.4)] active:scale-[0.97]"
                >
                  Переместить
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
