"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarEvent, CreateEventInput, EventStatus, EventType } from "@/lib/types";

interface EventModalProps {
  event?: CalendarEvent | null;
  mode: "view" | "add";
  onClose: () => void;
  onSave?: (event: CreateEventInput) => Promise<void> | void;
  onDelete?: (eventId: string) => Promise<void> | void;
  onToggleStatus?: (eventId: string, status: EventStatus) => Promise<void> | void;
}

interface AddFormData {
  title: string;
  type: EventType;
  date: string;
  time: string;
  description: string;
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

export default function EventModal({
  event,
  mode,
  onClose,
  onSave,
  onDelete,
  onToggleStatus,
}: EventModalProps) {
  const [formData, setFormData] = useState<AddFormData>({
    title: "",
    type: "event",
    date: getTodayString(),
    time: "",
    description: "",
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

    if (!validateForm()) {
      return;
    }

    if (!onSave) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        title: formData.title.trim(),
        type: formData.type,
        date: formData.date,
        time: formData.time || undefined,
        description: formData.description.trim(),
        status: "pending",
      });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сохранить";
      setSubmitError(message);
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
      const message = error instanceof Error ? error.message : "Не удалось удалить";
      setSubmitError(message);
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
      const message = error instanceof Error ? error.message : "Не удалось обновить статус";
      setSubmitError(message);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="calendar-modal-surface nd-animate-in w-full max-w-lg rounded-2xl border border-white/15 p-5 sm:p-6"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        {mode === "view" && event ? (
          <>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">{event.title}</h2>
                <p className="mt-1 text-sm text-zinc-400">{event.description || "Описание не добавлено"}</p>
              </div>

              <span
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                  event.type === "event"
                    ? "border-sky-400/35 bg-sky-500/15 text-sky-100"
                    : "border-violet-400/35 bg-violet-500/15 text-violet-100"
                }`}
              >
                {event.type === "event" ? "Событие" : "Задача"}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Дата</p>
                <p className="mt-1 text-sm text-zinc-100">{event.date}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Время</p>
                <p className="mt-1 text-sm text-zinc-100">{event.time ?? "Не указано"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Статус</p>
                <p
                  className={`mt-1 text-sm font-medium ${
                    (event.status ?? "pending") === "done" ? "text-emerald-300" : "text-amber-300"
                  }`}
                >
                  {getStatusLabel(event.status ?? "pending")}
                </p>
              </div>
            </div>

            {submitError && (
              <div className="mt-4 rounded-xl border border-red-500/35 bg-red-500/12 px-3 py-2 text-sm text-red-200">
                {submitError}
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={isTogglingStatus}
                className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTogglingStatus
                  ? "Обновление..."
                  : nextStatus === "done"
                    ? "Отметить выполненным"
                    : "Вернуть в работу"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl border border-red-400/35 bg-red-500/15 px-3 py-2 text-sm font-medium text-red-100 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Удаляем..." : "Удалить"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10"
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
                <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">Название</span>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(inputEvent) => handleChange("title", inputEvent.target.value)}
                  className={`h-10 rounded-xl border bg-black/30 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-white/25 ${
                    errors.title ? "border-red-500/70" : "border-white/12"
                  }`}
                  placeholder="Например, ревью инфраструктуры"
                />
                {errors.title && <span className="text-xs text-red-300">{errors.title}</span>}
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">Тип</span>
                  <select
                    value={formData.type}
                    onChange={(selectEvent) => handleChange("type", selectEvent.target.value)}
                    className="h-10 rounded-xl border border-white/12 bg-black/30 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-white/25"
                  >
                    <option value="event">Событие</option>
                    <option value="task">Задача</option>
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">Дата</span>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(inputEvent) => handleChange("date", inputEvent.target.value)}
                    className={`h-10 rounded-xl border bg-black/30 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-white/25 ${
                      errors.date ? "border-red-500/70" : "border-white/12"
                    }`}
                  />
                  {errors.date && <span className="text-xs text-red-300">{errors.date}</span>}
                </label>
              </div>

              <label className="grid gap-1.5">
                <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">Время (опционально)</span>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(inputEvent) => handleChange("time", inputEvent.target.value)}
                  className="h-10 rounded-xl border border-white/12 bg-black/30 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-white/25"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">Описание</span>
                <textarea
                  value={formData.description}
                  onChange={(inputEvent) => handleChange("description", inputEvent.target.value)}
                  className="min-h-24 rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-white/25"
                  placeholder="Короткое описание"
                />
              </label>

              {submitError && (
                <div className="rounded-xl border border-red-500/35 bg-red-500/12 px-3 py-2 text-sm text-red-200">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl border border-sky-400/40 bg-sky-500/20 px-3 py-2 text-sm font-medium text-sky-100 transition-colors hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
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
