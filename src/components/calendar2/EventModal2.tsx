"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  onUpdate?: (
    eventId: string,
    event: CreateEventInput,
    priority: TaskPriority,
  ) => Promise<void> | void;
  onDelete?: (eventId: string) => Promise<void> | void;
  onToggleStatus?: (eventId: string, status: EventStatus) => Promise<void> | void;
  onPriorityChange?: (eventId: string, priority: TaskPriority) => void;
}

interface EventFormData {
  title: string;
  type: EventType;
  date: string;
  time: string;
  description: string;
  priority: TaskPriority;
}

interface EventFormErrors {
  title?: string;
  date?: string;
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function getStatusLabel(status: EventStatus): string {
  return status === "done" ? "Выполнено" : "В работе";
}

function createEmptyForm(initialDate?: string): EventFormData {
  return {
    title: "",
    type: "task",
    date: initialDate ?? getTodayString(),
    time: "",
    description: "",
    priority: "medium",
  };
}

function buildFormFromEvent(event: CalendarEvent, priority: TaskPriority): EventFormData {
  return {
    title: event.title,
    type: event.type,
    date: event.date,
    time: event.time ?? "",
    description: event.description,
    priority,
  };
}

function formToPayload(formData: EventFormData): CreateEventInput {
  return {
    title: formData.title.trim(),
    type: formData.type,
    date: formData.date,
    time: formData.time || undefined,
    description: formData.description.trim(),
    status: "pending",
  };
}

export default function EventModal2({
  event,
  mode,
  initialDate,
  eventPriorities,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  onToggleStatus,
  onPriorityChange,
}: EventModal2Props) {
  const [formData, setFormData] = useState<EventFormData>(() => createEmptyForm(initialDate));
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const nextStatus = useMemo(() => {
    if (!event?.status) {
      return "done" as EventStatus;
    }
    return event.status === "done" ? "pending" : "done";
  }, [event?.status]);

  const currentPriority = event ? eventPriorities[event.id] ?? "medium" : "medium";

  useEffect(() => {
    if (mode === "add") {
      setFormData(createEmptyForm(initialDate));
      setIsEditMode(false);
      setErrors({});
      setSubmitError(null);
      return;
    }

    if (mode === "view" && event) {
      setFormData(buildFormFromEvent(event, currentPriority));
      setIsEditMode(false);
      setErrors({});
      setSubmitError(null);
    }
  }, [mode, event, initialDate, currentPriority]);

  const validateForm = (): boolean => {
    const nextErrors: EventFormErrors = {};

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

  const handleChange = (field: keyof EventFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof EventFormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCreateSubmit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setSubmitError(null);

    if (!validateForm() || !onSave) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formToPayload(formData), formData.priority);
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Не удалось сохранить",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setSubmitError(null);

    if (!event || !onUpdate || !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate(event.id, formToPayload(formData), formData.priority);
      setIsEditMode(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Не удалось обновить",
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

  const renderForm = (submitLabel: string, onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>, onCancel: () => void) => (
    <form className="space-y-3" onSubmit={(formEvent) => { void onSubmit(formEvent); }}>
      <label className="grid gap-1.5">
        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
          Название
        </span>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          className={`h-10 rounded-[6px] border bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none transition-colors focus:border-[rgba(94,106,210,0.42)] ${
            errors.title ? "border-[rgba(94,106,210,0.45)]" : "border-[var(--cal2-border)]"
          }`}
          placeholder="Например, ревью инфраструктуры"
        />
        {errors.title && (
          <span className="text-[11px] text-[#d9ddff]">{errors.title}</span>
        )}
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">Тип</span>
          <select
            value={formData.type}
            onChange={(e) => handleChange("type", e.target.value)}
            className="h-10 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
          >
            <option value="event">Событие</option>
            <option value="task">Задача</option>
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">Приоритет</span>
          <select
            value={formData.priority}
            onChange={(e) => handleChange("priority", e.target.value)}
            className="h-10 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
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
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">Дата</span>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleChange("date", e.target.value)}
            className={`h-10 rounded-[6px] border bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)] ${
              errors.date ? "border-[rgba(94,106,210,0.45)]" : "border-[var(--cal2-border)]"
            }`}
          />
          {errors.date && (
            <span className="text-[11px] text-[#d9ddff]">{errors.date}</span>
          )}
        </label>

        <label className="grid gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
            Время (опц.)
          </span>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => handleChange("time", e.target.value)}
            className="h-10 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
          />
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
          Описание
        </span>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className="min-h-20 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
          placeholder="Короткое описание"
        />
      </label>

      {submitError && (
        <div className="rounded-[6px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent-soft)] px-3 py-2 text-[12px] text-[#d9ddff]">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2 text-[12px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-[6px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent-soft)] px-3 py-2 text-[12px] font-medium text-[var(--cal2-text-primary)] transition-colors hover:bg-[var(--cal2-accent-soft-strong)] disabled:cursor-not-allowed disabled:border-[var(--cal2-border)] disabled:bg-[var(--cal2-surface-1)] disabled:text-[var(--cal2-text-disabled)]"
        >
          {isSubmitting ? "Сохраняем..." : submitLabel}
        </button>
      </div>
    </form>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--cal2-overlay)] px-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="nd-animate-in w-full max-w-lg rounded-[10px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {mode === "view" && event ? (
          isEditMode ? (
            <>
              <h2 className="mb-4 text-[16px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)]">Редактировать событие</h2>
              {renderForm("Сохранить", handleUpdateSubmit, () => {
                setIsEditMode(false);
                setFormData(buildFormFromEvent(event, currentPriority));
                setErrors({});
                setSubmitError(null);
              })}
            </>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)]">{event.title}</h2>
                  <p className="mt-1 text-[12px] text-[var(--cal2-text-secondary)]">
                    {event.description || "Описание не добавлено"}
                  </p>
                </div>
                <span
                  className={`rounded-[6px] border px-2.5 py-1 text-[11px] font-semibold ${
                    event.type === "event"
                      ? "border-[rgba(94,106,210,0.42)] bg-[var(--cal2-accent-soft)] text-[var(--cal2-text-primary)]"
                      : "border-[var(--cal2-border)] bg-[rgba(255,255,255,0.05)] text-[var(--cal2-text-primary)]"
                  }`}
                >
                  {event.type === "event" ? "Событие" : "Задача"}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">Дата</p>
                  <p className="mt-1 text-[12px] text-[var(--cal2-text-primary)]">{event.date}</p>
                </div>
                <div className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">Время</p>
                  <p className="mt-1 text-[12px] text-[var(--cal2-text-primary)]">{event.time ?? "Не указано"}</p>
                </div>
                <div className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">Статус</p>
                  <p
                    className={`mt-1 text-[12px] font-medium ${
                      (event.status ?? "pending") === "done"
                        ? "text-[var(--cal2-text-primary)]"
                        : "text-[#d6dbff]"
                    }`}
                  >
                    {getStatusLabel(event.status ?? "pending")}
                  </p>
                </div>
                <div className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">Приоритет</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG.urgent][]).map(
                      ([key, config]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => onPriorityChange?.(event.id, key)}
                          className={`rounded-[4px] border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                            currentPriority === key
                              ? `${config.bg} ${config.border} ${config.color}`
                              : "border-[var(--cal2-border)] bg-transparent text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
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
                <div className="mt-4 rounded-[6px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent-soft)] px-3 py-2 text-[12px] text-[#d9ddff]">
                  {submitError}
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  disabled={isTogglingStatus}
                  className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2 text-[12px] font-medium text-[var(--cal2-text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.07)] disabled:cursor-not-allowed disabled:text-[var(--cal2-text-disabled)]"
                >
                  {isTogglingStatus
                    ? "..."
                    : nextStatus === "done"
                      ? "✓ Выполнено"
                      : "↻ В работу"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2 text-[12px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
                >
                  Редактировать
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2 text-[12px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:text-[var(--cal2-text-disabled)]"
                >
                  {isDeleting ? "..." : "Удалить"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2 text-[12px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
                >
                  Закрыть
                </button>
              </div>
            </>
          )
        ) : (
          <>
            <h2 className="mb-4 text-[16px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)]">Новое событие</h2>
            {renderForm("Сохранить", handleCreateSubmit, onClose)}
          </>
        )}
      </div>
    </div>
  );
}
