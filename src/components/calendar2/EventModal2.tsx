"use client";

import { FormEvent, useMemo, useState } from "react";
import type {
  CalendarEvent,
  CreateEventInput,
  EventStatus,
  EventType,
} from "@/lib/types";
import { PRIORITY_CONFIG, type TaskPriority } from "./calendar2-types";

interface EventModal2Props {
  event?: CalendarEvent | null;
  mode: "view" | "add";
  initialDate?: string;
  eventPriorities: Record<string, TaskPriority>;
  onClose: () => void;
  onSave?: (event: CreateEventInput, priority: TaskPriority) => Promise<void> | void;
  onDelete?: (eventId: string) => Promise<void> | void;
  onToggleStatus?: (eventId: string, status: EventStatus) => Promise<void> | void;
  onPriorityChange?: (eventId: string, priority: TaskPriority) => void;
}

interface AddFormData {
  title: string;
  type: EventType;
  date: string;
  time: string;
  description: string;
  priority: TaskPriority;
}

interface AddFormErrors {
  title?: string;
  date?: string;
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function getStatusLabel(status: EventStatus): string {
  return status === "done" ? "Выполнено" : "В работе";
}

export default function EventModal2({
  event,
  mode,
  initialDate,
  eventPriorities,
  onClose,
  onSave,
  onDelete,
  onToggleStatus,
  onPriorityChange,
}: EventModal2Props) {
  const [formData, setFormData] = useState<AddFormData>({
    title: "",
    type: "task",
    date: initialDate ?? getTodayString(),
    time: "",
    description: "",
    priority: "medium",
  });
  const [errors, setErrors] = useState<AddFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const nextStatus = useMemo(() => {
    if (!event?.status) {
      return "done" as EventStatus;
    }
    return event.status === "done" ? "pending" : "done";
  }, [event?.status]);

  const currentPriority = event ? eventPriorities[event.id] ?? "medium" : "medium";

  const validateForm = (): boolean => {
    const nextErrors: AddFormErrors = {};

    if (!formData.title.trim()) {
      nextErrors.title = "Укажите название";
    } else if (formData.title.trim().length > 100) {
      nextErrors.title = "Название должно быть короче 100 символов";
    }

    if (!formData.date) {
      nextErrors.date = "Укажите дату";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (field: keyof AddFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof AddFormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setSubmitError(null);

    if (!validateForm() || !onSave) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(
        {
          title: formData.title.trim(),
          type: formData.type,
          date: formData.date,
          time: formData.time || undefined,
          description: formData.description.trim(),
          status: "pending",
        },
        formData.priority,
      );
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Не удалось сохранить",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete) {
      return;
    }

    setSubmitError(null);
    setIsDeleting(true);

    try {
      await onDelete(event.id);
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Не удалось удалить",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!event || !onToggleStatus) {
      return;
    }

    setSubmitError(null);
    setIsTogglingStatus(true);

    try {
      await onToggleStatus(event.id, nextStatus);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Не удалось обновить",
      );
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a1a]/80 px-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="nd-animate-in w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#16162a]/95 p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {mode === "view" && event ? (
          <>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">{event.title}</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {event.description || "Описание не добавлено"}
                </p>
              </div>
              <span
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                  event.type === "event"
                    ? "border-indigo-400/30 bg-indigo-500/15 text-indigo-200"
                    : "border-violet-400/30 bg-violet-500/15 text-violet-200"
                }`}
              >
                {event.type === "event" ? "Событие" : "Задача"}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">Дата</p>
                <p className="mt-1 text-sm text-zinc-200">{event.date}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">Время</p>
                <p className="mt-1 text-sm text-zinc-200">{event.time ?? "Не указано"}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">Статус</p>
                <p
                  className={`mt-1 text-sm font-medium ${
                    (event.status ?? "pending") === "done"
                      ? "text-emerald-300"
                      : "text-amber-300"
                  }`}
                >
                  {getStatusLabel(event.status ?? "pending")}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">Приоритет</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG.urgent][]).map(
                    ([key, config]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onPriorityChange?.(event.id, key)}
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                          currentPriority === key
                            ? `${config.bg} ${config.border} ${config.color}`
                            : "border-white/[0.06] bg-transparent text-zinc-600 hover:text-zinc-400"
                        }`}
                      >
                        {config.label}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>

            {submitError && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {submitError}
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={isTogglingStatus}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTogglingStatus
                  ? "..."
                  : nextStatus === "done"
                    ? "✓ Выполнено"
                    : "↻ В работу"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl border border-red-400/25 bg-red-500/12 px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "..." : "Удалить"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.08]"
              >
                Закрыть
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">Новое событие</h2>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <label className="grid gap-1.5">
                <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                  Название
                </span>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className={`h-10 rounded-xl border bg-black/30 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-indigo-400/30 ${
                    errors.title ? "border-red-500/50" : "border-white/[0.08]"
                  }`}
                  placeholder="Например, ревью инфраструктуры"
                />
                {errors.title && (
                  <span className="text-xs text-red-300">{errors.title}</span>
                )}
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">Тип</span>
                  <select
                    value={formData.type}
                    onChange={(e) => handleChange("type", e.target.value)}
                    className="h-10 rounded-xl border border-white/[0.08] bg-black/30 px-3 text-sm text-zinc-100 outline-none focus:border-indigo-400/30"
                  >
                    <option value="event">Событие</option>
                    <option value="task">Задача</option>
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">Приоритет</span>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleChange("priority", e.target.value)}
                    className="h-10 rounded-xl border border-white/[0.08] bg-black/30 px-3 text-sm text-zinc-100 outline-none focus:border-indigo-400/30"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">Дата</span>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleChange("date", e.target.value)}
                    className={`h-10 rounded-xl border bg-black/30 px-3 text-sm text-zinc-100 outline-none focus:border-indigo-400/30 ${
                      errors.date ? "border-red-500/50" : "border-white/[0.08]"
                    }`}
                  />
                  {errors.date && (
                    <span className="text-xs text-red-300">{errors.date}</span>
                  )}
                </label>

                <label className="grid gap-1.5">
                  <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                    Время (опц.)
                  </span>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleChange("time", e.target.value)}
                    className="h-10 rounded-xl border border-white/[0.08] bg-black/30 px-3 text-sm text-zinc-100 outline-none focus:border-indigo-400/30"
                  />
                </label>
              </div>

              <label className="grid gap-1.5">
                <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                  Описание
                </span>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="min-h-20 rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-400/30"
                  placeholder="Короткое описание"
                />
              </label>

              {submitError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.08]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl border border-indigo-400/30 bg-indigo-500/20 px-3 py-2 text-sm font-medium text-indigo-200 transition-colors hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Сохраняем..." : "Сохранить"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
