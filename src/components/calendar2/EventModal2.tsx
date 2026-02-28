"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  CalendarEvent,
  CreateEventInput,
  EventRecurrence,
  EventStatus,
  EventType,
  RecurrenceScope,
} from "@/lib/types";
import {
  PRIORITY_CONFIG,
  type CalendarCategory,
  type KanbanCard,
  type Note,
  type TaskPriority,
} from "./calendar2-types";
import { findTimeConflicts } from "./conflict-utils";

interface EventModal2Props {
  event?: CalendarEvent | null;
  mode: "view" | "add";
  initialDate?: string;
  eventPriorities: Record<string, TaskPriority>;
  existingEvents?: CalendarEvent[];
  categories?: CalendarCategory[];
  linkedNotes?: Note[];
  linkedKanbanCards?: KanbanCard[];
  onClose: () => void;
  onSave?: (event: CreateEventInput, priority: TaskPriority) => Promise<void> | void;
  onUpdate?: (
    eventId: string,
    event: CreateEventInput,
    priority: TaskPriority,
    scope: RecurrenceScope,
  ) => Promise<void> | void;
  onDelete?: (eventId: string, scope: RecurrenceScope) => Promise<void> | void;
  onToggleStatus?: (
    eventId: string,
    status: EventStatus,
    scope: RecurrenceScope,
  ) => Promise<void> | void;
  onPriorityChange?: (eventId: string, priority: TaskPriority) => void;
  onConvertToTask?: (eventId: string) => Promise<void> | void;
  onConvertToEvent?: (eventId: string) => Promise<void> | void;
  onConvertToNote?: (eventId: string) => Promise<void> | void;
}

interface EventFormData {
  title: string;
  type: EventType;
  date: string;
  time: string;
  description: string;
  priority: TaskPriority;
  categoryId: string;
  recurrenceFrequency: "none" | EventRecurrence["frequency"];
  recurrenceInterval: string;
  recurrenceCount: string;
  recurrenceUntil: string;
}

interface EventFormErrors {
  title?: string;
  date?: string;
  recurrence?: string;
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
    categoryId: "",
    recurrenceFrequency: "none",
    recurrenceInterval: "1",
    recurrenceCount: "",
    recurrenceUntil: "",
  };
}

function buildFormFromEvent(event: CalendarEvent, priority: TaskPriority): EventFormData {
  const recurrence = event.recurrence;
  return {
    title: event.title,
    type: event.type,
    date: event.date,
    time: event.time ?? "",
    description: event.description,
    priority,
    categoryId: event.categoryId ?? "",
    recurrenceFrequency: recurrence?.frequency ?? "none",
    recurrenceInterval: recurrence ? String(recurrence.interval) : "1",
    recurrenceCount: recurrence?.count ? String(recurrence.count) : "",
    recurrenceUntil: recurrence?.until ?? "",
  };
}

function buildRecurrenceFromForm(formData: EventFormData): EventRecurrence | undefined {
  if (formData.recurrenceFrequency === "none") {
    return undefined;
  }

  const intervalRaw = Number(formData.recurrenceInterval || "1");
  const interval = Number.isInteger(intervalRaw) && intervalRaw > 0 ? intervalRaw : 1;
  const countRaw = formData.recurrenceCount ? Number(formData.recurrenceCount) : undefined;
  const count = countRaw && Number.isInteger(countRaw) && countRaw > 0 ? countRaw : undefined;
  const until = formData.recurrenceUntil || undefined;

  return {
    frequency: formData.recurrenceFrequency,
    interval,
    count,
    until,
  };
}

function isSameRecurrence(
  left: EventRecurrence | undefined,
  right: EventRecurrence | undefined,
): boolean {
  if (!left && !right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return (
    left.frequency === right.frequency &&
    left.interval === right.interval &&
    (left.count ?? undefined) === (right.count ?? undefined) &&
    (left.until ?? undefined) === (right.until ?? undefined)
  );
}

function formToPayload(formData: EventFormData, includeRecurrence: boolean): CreateEventInput {
  return {
    title: formData.title.trim(),
    type: formData.type,
    date: formData.date,
    time: formData.time || undefined,
    description: formData.description.trim(),
    status: "pending",
    categoryId: formData.categoryId || undefined,
    recurrence: includeRecurrence ? buildRecurrenceFromForm(formData) : undefined,
  };
}

export default function EventModal2({
  event,
  mode,
  initialDate,
  eventPriorities,
  existingEvents = [],
  categories = [],
  linkedNotes = [],
  linkedKanbanCards = [],
  onClose,
  onSave,
  onUpdate,
  onDelete,
  onToggleStatus,
  onPriorityChange,
  onConvertToTask,
  onConvertToEvent,
  onConvertToNote,
}: EventModal2Props) {
  const [formData, setFormData] = useState<EventFormData>(() => createEmptyForm(initialDate));
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [applyScope, setApplyScope] = useState<RecurrenceScope>("this");
  const [showLinked, setShowLinked] = useState(false);

  const nextStatus = useMemo(() => {
    if (!event?.status) {
      return "done" as EventStatus;
    }
    return event.status === "done" ? "pending" : "done";
  }, [event?.status]);

  const currentPriority = event ? eventPriorities[event.id] ?? "medium" : "medium";
  const categoriesForSelect = useMemo(() => {
    if (!event?.categoryId) {
      return categories;
    }
    if (categories.some((category) => category.id === event.categoryId)) {
      return categories;
    }

    return [
      {
        id: event.categoryId,
        label: `Категория #${event.categoryId.slice(0, 8)}`,
        color: "#64748b",
        createdAt: new Date(0).toISOString(),
      },
      ...categories,
    ];
  }, [categories, event?.categoryId]);
  const hasRecurringSeries = Boolean(event?.recurrenceSeriesId);
  const isSeriesWideEdit =
    mode === "view" && isEditMode && hasRecurringSeries && applyScope !== "this";
  const shouldEditRecurrence =
    mode === "add" || isSeriesWideEdit;
  const timeConflicts = useMemo(
    () =>
      findTimeConflicts(existingEvents, {
        date: formData.date,
        time: formData.time,
        excludeEventId: event?.id,
      }),
    [existingEvents, formData.date, formData.time, event?.id],
  );

  useEffect(() => {
    if (mode === "add") {
      setFormData(createEmptyForm(initialDate));
      setIsEditMode(false);
      setApplyScope("this");
      setErrors({});
      setSubmitError(null);
      return;
    }

    if (mode === "view" && event) {
      setFormData(buildFormFromEvent(event, currentPriority));
      setIsEditMode(false);
      setApplyScope("this");
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

    if (shouldEditRecurrence && formData.recurrenceFrequency !== "none") {
      if (!formData.recurrenceCount && !formData.recurrenceUntil) {
        nextErrors.recurrence = "Укажите число повторений или дату окончания";
      } else if (formData.recurrenceUntil && formData.recurrenceUntil < formData.date) {
        nextErrors.recurrence = "Дата окончания должна быть не раньше даты события";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (field: keyof EventFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof EventFormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (
      field === "recurrenceFrequency" ||
      field === "recurrenceInterval" ||
      field === "recurrenceCount" ||
      field === "recurrenceUntil"
    ) {
      setErrors((prev) => ({ ...prev, recurrence: undefined }));
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
      await onSave(formToPayload(formData, true), formData.priority);
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
    const nextRecurrence = buildRecurrenceFromForm(formData);
    const recurrenceChanged = !isSameRecurrence(event.recurrence, nextRecurrence);
    const includeRecurrence =
      hasRecurringSeries && applyScope !== "this" && recurrenceChanged;

    try {
      await onUpdate(event.id, formToPayload(formData, includeRecurrence), formData.priority, applyScope);
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
      await onDelete(event.id, applyScope);
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
      await onToggleStatus(event.id, nextStatus, applyScope);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Не удалось обновить",
      );
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleConvertToTask = async () => {
    if (!event || !onConvertToTask) return;
    setSubmitError(null);
    setIsConverting(true);
    try {
      await onConvertToTask(event.id);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Не удалось конвертировать");
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvertToEvent = async () => {
    if (!event || !onConvertToEvent) return;
    setSubmitError(null);
    setIsConverting(true);
    try {
      await onConvertToEvent(event.id);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Не удалось конвертировать");
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvertToNote = async () => {
    if (!event || !onConvertToNote) return;
    setSubmitError(null);
    setIsConverting(true);
    try {
      await onConvertToNote(event.id);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Не удалось конвертировать");
    } finally {
      setIsConverting(false);
    }
  };

  const renderLinkedEntities = () => {
    const hasLinked = linkedNotes.length > 0 || linkedKanbanCards.length > 0;
    if (!hasLinked) return null;

    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowLinked((v) => !v)}
          className="flex w-full items-center justify-between rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2 text-[12px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
        >
          <span>Связанные ({linkedNotes.length + linkedKanbanCards.length})</span>
          <span>{showLinked ? "▲" : "▼"}</span>
        </button>
        {showLinked && (
          <div className="mt-2 space-y-2">
            {linkedKanbanCards.map((card) => (
              <div
                key={card.id}
                className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                  Kanban
                </p>
                <p className="mt-1 text-[12px] font-medium text-[var(--cal2-text-primary)]">
                  {card.title}
                </p>
                <p className="text-[11px] text-[var(--cal2-text-secondary)]">{card.column}</p>
              </div>
            ))}
            {linkedNotes.map((note) => (
              <div
                key={note.id}
                className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                  Заметка
                </p>
                <p className="mt-1 text-[12px] font-medium text-[var(--cal2-text-primary)]">
                  {note.title}
                </p>
                <p className="line-clamp-2 text-[11px] text-[var(--cal2-text-secondary)]">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderScopeSelector = () => (
    <div className="mb-4 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
        Применить к
      </p>
      <div className="mt-2 inline-flex rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-0.5">
        {([
          { id: "this", label: "Только это" },
          { id: "all", label: "Вся серия" },
          { id: "this_and_following", label: "Это и следующие" },
        ] as const).map((scope) => (
          <button
            key={scope.id}
            type="button"
            onClick={() => setApplyScope(scope.id)}
            className={`rounded-[4px] px-2 py-1 text-[11px] font-medium transition-colors ${
              applyScope === scope.id
                ? "border border-[rgba(94,106,210,0.42)] bg-[var(--cal2-accent-soft)] text-[var(--cal2-text-primary)]"
                : "text-[var(--cal2-text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--cal2-text-primary)]"
            }`}
          >
            {scope.label}
          </button>
        ))}
      </div>
    </div>
  );

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

      {categoriesForSelect.length > 0 && (
        <label className="grid gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
            Категория
          </span>
          <select
            value={formData.categoryId}
            onChange={(e) => handleChange("categoryId", e.target.value)}
            className="h-10 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
          >
            <option value="">— Без категории</option>
            {categoriesForSelect.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">Дата</span>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleChange("date", e.target.value)}
            disabled={isSeriesWideEdit}
            className={`h-10 rounded-[6px] border bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)] disabled:cursor-not-allowed disabled:text-[var(--cal2-text-disabled)] ${
              errors.date ? "border-[rgba(94,106,210,0.45)]" : "border-[var(--cal2-border)]"
            }`}
          />
          {isSeriesWideEdit && (
            <span className="text-[10px] text-[var(--cal2-text-secondary)]">
              Дата недоступна для выбранного scope
            </span>
          )}
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

      {shouldEditRecurrence && (
        <div className="grid gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                Повтор
              </span>
              <select
                value={formData.recurrenceFrequency}
                onChange={(e) => handleChange("recurrenceFrequency", e.target.value)}
                className="h-10 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
              >
                <option value="none">Не повторять</option>
                <option value="daily">Каждый день</option>
                <option value="weekly">Каждую неделю</option>
                <option value="monthly">Каждый месяц</option>
              </select>
            </label>

            {formData.recurrenceFrequency !== "none" && (
              <label className="grid gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                  Интервал
                </span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={formData.recurrenceInterval}
                  onChange={(e) => handleChange("recurrenceInterval", e.target.value)}
                  className="h-10 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
                />
              </label>
            )}
          </div>

          {formData.recurrenceFrequency !== "none" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                  Число повторов
                </span>
                <input
                  type="number"
                  min={1}
                  max={400}
                  value={formData.recurrenceCount}
                  onChange={(e) => handleChange("recurrenceCount", e.target.value)}
                  placeholder="например, 12"
                  className="h-10 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                  До даты
                </span>
                <input
                  type="date"
                  value={formData.recurrenceUntil}
                  onChange={(e) => handleChange("recurrenceUntil", e.target.value)}
                  className="h-10 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {errors.recurrence && (
        <span className="text-[11px] text-[#d9ddff]">{errors.recurrence}</span>
      )}

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

      {timeConflicts.length > 0 && (
        <div className="rounded-[6px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent-soft)] px-3 py-2 text-[12px] text-[#d9ddff]">
          <p className="font-medium">Конфликт времени: {timeConflicts.length}</p>
          <p className="mt-1 text-[11px]">
            Найдены события на эту же дату и время. Сохранение всё равно доступно.
          </p>
          <ul className="mt-2 space-y-0.5 text-[11px]">
            {timeConflicts.slice(0, 3).map((conflict) => (
              <li key={conflict.id} className="truncate text-[var(--cal2-text-primary)]">
                {conflict.time ?? "--:--"} · {conflict.title}
              </li>
            ))}
          </ul>
        </div>
      )}

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
              {hasRecurringSeries && renderScopeSelector()}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[16px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)]">{event.title}</h2>
                    {event.recurrenceException && (
                      <span className="rounded-[4px] border border-[rgba(255,200,100,0.4)] bg-[rgba(255,200,100,0.12)] px-1.5 py-0.5 text-[10px] font-medium text-[#ffd080]">
                        Исключение
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] text-[var(--cal2-text-secondary)]">
                    {event.description || "Описание не добавлено"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-[6px] border px-2.5 py-1 text-[11px] font-semibold ${
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

              {hasRecurringSeries && <div className="mt-4">{renderScopeSelector()}</div>}

              {renderLinkedEntities()}

              {/* Convert actions */}
              {(onConvertToTask ?? onConvertToEvent ?? onConvertToNote) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {event.type === "event" && onConvertToTask && (
                    <button
                      type="button"
                      onClick={() => { void handleConvertToTask(); }}
                      disabled={isConverting}
                      className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-1.5 text-[11px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:text-[var(--cal2-text-disabled)]"
                    >
                      {isConverting ? "..." : "→ Задача"}
                    </button>
                  )}
                  {event.type === "task" && onConvertToEvent && (
                    <button
                      type="button"
                      onClick={() => { void handleConvertToEvent(); }}
                      disabled={isConverting}
                      className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-1.5 text-[11px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:text-[var(--cal2-text-disabled)]"
                    >
                      {isConverting ? "..." : "→ Событие"}
                    </button>
                  )}
                  {onConvertToNote && (
                    <button
                      type="button"
                      onClick={() => { void handleConvertToNote(); }}
                      disabled={isConverting}
                      className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-1.5 text-[11px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:text-[var(--cal2-text-disabled)]"
                    >
                      {isConverting ? "..." : "→ Заметка"}
                    </button>
                  )}
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
