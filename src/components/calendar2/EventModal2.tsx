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

  /* ── Priority dot colors ── */
  const PRIORITY_DOTS: Record<TaskPriority, { dot: string; ring: string; dotActive: string }> = {
    urgent: { dot: "bg-[#F87171]/40", ring: "", dotActive: "bg-[#F87171] ring-2 ring-[rgba(248,113,113,0.35)]" },
    high: { dot: "bg-[#FBBF24]/40", ring: "", dotActive: "bg-[#FBBF24] ring-2 ring-[rgba(251,191,36,0.35)]" },
    medium: { dot: "bg-[#5E6AD2]/40", ring: "", dotActive: "bg-[#5E6AD2] ring-2 ring-[rgba(94,106,210,0.35)]" },
    low: { dot: "bg-[#555]/40", ring: "", dotActive: "bg-[#6B6B6B] ring-2 ring-[rgba(107,107,107,0.35)]" },
  };

  /* ── Shared styles ── */
  const inputBase = "h-9 w-full rounded-lg border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[13px] text-[var(--cal2-text-primary)] outline-none transition-colors focus:border-[rgba(94,106,210,0.4)] placeholder:text-[var(--cal2-text-disabled)]";
  const labelBase = "text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--cal2-text-secondary)]";
  const dividerLine = "h-px w-full bg-[var(--cal2-border)]";

  const renderLinkedEntities = () => {
    const hasLinked = linkedNotes.length > 0 || linkedKanbanCards.length > 0;
    if (!hasLinked) return null;

    return (
      <div className="mt-5">
        <button
          type="button"
          onClick={() => setShowLinked((v) => !v)}
          className="group flex w-full items-center gap-2 py-1.5 text-left"
        >
          <span className={labelBase}>
            Связанные
          </span>
          <span className="rounded-full bg-[var(--cal2-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--cal2-accent)]">
            {linkedNotes.length + linkedKanbanCards.length}
          </span>
          <svg
            className={`ml-auto h-3.5 w-3.5 text-[var(--cal2-text-disabled)] transition-transform duration-150 ${showLinked ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showLinked && (
          <div className="mt-2 space-y-1.5">
            {linkedKanbanCards.map((card) => (
              <div
                key={card.id}
                className="flex items-start gap-2.5 rounded-lg border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2.5"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[var(--cal2-accent-soft)] text-[9px] font-bold text-[var(--cal2-accent)]">
                  K
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-[var(--cal2-text-primary)]">
                    {card.title}
                  </p>
                  <p className="text-[11px] text-[var(--cal2-text-secondary)]">{card.column}</p>
                </div>
              </div>
            ))}
            {linkedNotes.map((note) => (
              <div
                key={note.id}
                className="flex items-start gap-2.5 rounded-lg border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2.5"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[rgba(251,191,36,0.12)] text-[9px] font-bold text-[#FBBF24]">
                  N
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-[var(--cal2-text-primary)]">
                    {note.title}
                  </p>
                  <p className="line-clamp-1 text-[11px] text-[var(--cal2-text-secondary)]">
                    {note.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderScopeSelector = () => (
    <div className="mb-5">
      <p className={`${labelBase} mb-2`}>Применить к</p>
      <div className="inline-flex rounded-lg border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] p-0.5">
        {([
          { id: "this", label: "Только это" },
          { id: "all", label: "Вся серия" },
          { id: "this_and_following", label: "Это и далее" },
        ] as const).map((scope) => (
          <button
            key={scope.id}
            type="button"
            onClick={() => setApplyScope(scope.id)}
            className={`rounded-[6px] px-3 py-1.5 text-[11px] font-medium transition-all duration-150 ${
              applyScope === scope.id
                ? "bg-[var(--cal2-accent-soft)] text-[var(--cal2-text-primary)] shadow-[inset_0_0_0_1px_rgba(94,106,210,0.3)]"
                : "text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
            }`}
          >
            {scope.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderForm = (submitLabel: string, onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>, onCancel: () => void) => (
    <form className="space-y-0" onSubmit={(formEvent) => { void onSubmit(formEvent); }}>
      {/* ── Title input ── */}
      <div className="mb-5">
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          className={`w-full border-0 border-b bg-transparent px-0 pb-2.5 pt-0 text-[16px] font-medium tracking-[-0.01em] text-[var(--cal2-text-primary)] outline-none transition-colors placeholder:text-[var(--cal2-text-disabled)] ${
            errors.title
              ? "border-b-[#F87171]"
              : "border-b-[var(--cal2-border)] focus:border-b-[var(--cal2-accent)]"
          }`}
          placeholder="Название события..."
          autoFocus
        />
        {errors.title && (
          <span className="mt-1.5 block text-[11px] text-[#F87171]">{errors.title}</span>
        )}
      </div>

      {/* ── Type toggle (segmented) ── */}
      <div className="mb-4">
        <p className={`${labelBase} mb-2`}>Тип</p>
        <div className="inline-flex rounded-lg border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] p-0.5">
          {([
            { id: "event" as const, label: "Событие", icon: "◆" },
            { id: "task" as const, label: "Задача", icon: "■" },
          ]).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleChange("type", t.id)}
              className={`flex items-center gap-1.5 rounded-[6px] px-3.5 py-1.5 text-[12px] font-medium transition-all duration-150 ${
                formData.type === t.id
                  ? "bg-[var(--cal2-accent-soft)] text-[var(--cal2-text-primary)] shadow-[inset_0_0_0_1px_rgba(94,106,210,0.3)]"
                  : "text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
              }`}
            >
              <span className={`text-[10px] ${formData.type === t.id ? "text-[var(--cal2-accent)]" : ""}`}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Priority dots ── */}
      <div className="mb-4">
        <p className={`${labelBase} mb-2`}>Приоритет</p>
        <div className="flex items-center gap-1">
          {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG.urgent][]).map(
            ([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleChange("priority", key)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all duration-150 ${
                  formData.priority === key
                    ? "bg-[var(--cal2-surface-1)] text-[var(--cal2-text-primary)] shadow-[inset_0_0_0_1px_var(--cal2-border)]"
                    : "text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full transition-all ${
                    formData.priority === key ? PRIORITY_DOTS[key].dotActive : PRIORITY_DOTS[key].dot
                  }`}
                />
                {config.label}
              </button>
            ),
          )}
        </div>
      </div>

      {/* ── Category ── */}
      {categoriesForSelect.length > 0 && (
        <div className="mb-4">
          <p className={`${labelBase} mb-2`}>Категория</p>
          <select
            value={formData.categoryId}
            onChange={(e) => handleChange("categoryId", e.target.value)}
            className={inputBase}
          >
            <option value="">— Без категории</option>
            {categoriesForSelect.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={dividerLine} />

      {/* ── Date & Time ── */}
      <div className="grid grid-cols-2 gap-3 py-4">
        <label className="grid gap-1.5">
          <span className={labelBase}>Дата</span>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleChange("date", e.target.value)}
            disabled={isSeriesWideEdit}
            className={`${inputBase} ${errors.date ? "!border-[#F87171]" : ""} disabled:cursor-not-allowed disabled:text-[var(--cal2-text-disabled)]`}
          />
          {isSeriesWideEdit && (
            <span className="text-[10px] text-[var(--cal2-text-secondary)]">
              Недоступно для scope
            </span>
          )}
          {errors.date && (
            <span className="text-[11px] text-[#F87171]">{errors.date}</span>
          )}
        </label>

        <label className="grid gap-1.5">
          <span className={labelBase}>Время</span>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => handleChange("time", e.target.value)}
            className={inputBase}
          />
        </label>
      </div>

      {/* ── Recurrence ── */}
      {shouldEditRecurrence && (
        <div className="pb-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className={labelBase}>Повтор</span>
              <select
                value={formData.recurrenceFrequency}
                onChange={(e) => handleChange("recurrenceFrequency", e.target.value)}
                className={inputBase}
              >
                <option value="none">Не повторять</option>
                <option value="daily">Каждый день</option>
                <option value="weekly">Каждую неделю</option>
                <option value="monthly">Каждый месяц</option>
              </select>
            </label>

            {formData.recurrenceFrequency !== "none" && (
              <label className="grid gap-1.5">
                <span className={labelBase}>Интервал</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={formData.recurrenceInterval}
                  onChange={(e) => handleChange("recurrenceInterval", e.target.value)}
                  className={inputBase}
                />
              </label>
            )}
          </div>

          {formData.recurrenceFrequency !== "none" && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="grid gap-1.5">
                <span className={labelBase}>Повторов</span>
                <input
                  type="number"
                  min={1}
                  max={400}
                  value={formData.recurrenceCount}
                  onChange={(e) => handleChange("recurrenceCount", e.target.value)}
                  placeholder="12"
                  className={inputBase}
                />
              </label>

              <label className="grid gap-1.5">
                <span className={labelBase}>До даты</span>
                <input
                  type="date"
                  value={formData.recurrenceUntil}
                  onChange={(e) => handleChange("recurrenceUntil", e.target.value)}
                  className={inputBase}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {errors.recurrence && (
        <span className="block pb-2 text-[11px] text-[#F87171]">{errors.recurrence}</span>
      )}

      <div className={dividerLine} />

      {/* ── Description ── */}
      <div className="py-4">
        <p className={`${labelBase} mb-2`}>Описание</p>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className="min-h-[72px] w-full resize-none rounded-lg border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--cal2-text-primary)] outline-none transition-colors focus:border-[rgba(94,106,210,0.4)] placeholder:text-[var(--cal2-text-disabled)]"
          placeholder="Добавьте описание..."
        />
      </div>

      {/* ── Time conflicts ── */}
      {timeConflicts.length > 0 && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-[rgba(251,191,36,0.25)] bg-[rgba(251,191,36,0.06)] px-3 py-2.5">
          <span className="mt-0.5 text-[14px] leading-none">⚠</span>
          <div>
            <p className="text-[12px] font-medium text-[#FBBF24]">
              Конфликт времени: {timeConflicts.length}
            </p>
            <ul className="mt-1 space-y-0.5">
              {timeConflicts.slice(0, 3).map((conflict) => (
                <li key={conflict.id} className="truncate text-[11px] text-[var(--cal2-text-secondary)]">
                  {conflict.time ?? "--:--"} · {conflict.title}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Submit error ── */}
      {submitError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.06)] px-3 py-2.5 text-[12px] text-[#F87171]">
          <span className="text-[14px] leading-none">✕</span>
          {submitError}
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-[13px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--cal2-text-primary)]"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-[var(--cal2-accent)] px-5 py-2 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:bg-[var(--cal2-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? "Сохраняем..." : submitLabel}
        </button>
      </div>
    </form>
  );

  const isTaskType = mode === "view" && event ? event.type === "task" : formData.type === "task";

  return (
    <div
      className="cal2-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="cal2-modal-card w-full max-w-md overflow-hidden rounded-xl border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Accent top stripe ── */}
        <div className={`h-[2px] w-full ${isTaskType ? "cal2-accent-stripe-task" : "cal2-accent-stripe"}`} />

        <div className="p-5 sm:p-6">
          {mode === "view" && event ? (
            isEditMode ? (
              <>
                {/* ── Edit mode header ── */}
                <div className="mb-5 flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--cal2-accent-soft)] text-[10px] text-[var(--cal2-accent)]">
                    ✎
                  </span>
                  <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--cal2-text-primary)]">
                    Редактировать
                  </h2>
                </div>

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
                {/* ── View mode ── */}
                {/* Title + badge */}
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[18px] font-semibold tracking-[-0.02em] leading-[1.2] text-[var(--cal2-text-primary)]">
                        {event.title}
                      </h2>
                      {event.recurrenceException && (
                        <span className="rounded-full bg-[rgba(251,191,36,0.1)] px-2 py-0.5 text-[10px] font-medium text-[#FBBF24]">
                          Исключение
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                      event.type === "event"
                        ? "bg-[var(--cal2-accent-soft)] text-[var(--cal2-accent)]"
                        : "bg-[rgba(255,255,255,0.06)] text-[var(--cal2-text-secondary)]"
                    }`}
                  >
                    {event.type === "event" ? "◆ Событие" : "■ Задача"}
                  </span>
                </div>

                {/* ── Metadata rows ── */}
                <div className="rounded-lg border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)]">
                  {/* Date */}
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className={labelBase}>Дата</span>
                    <span className="text-[13px] tabular-nums text-[var(--cal2-text-primary)]">{event.date}</span>
                  </div>
                  <div className="mx-3.5 h-px bg-[var(--cal2-border)]" />

                  {/* Time */}
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className={labelBase}>Время</span>
                    <span className={`text-[13px] ${event.time ? "tabular-nums text-[var(--cal2-text-primary)]" : "text-[var(--cal2-text-disabled)]"}`}>
                      {event.time ?? "—"}
                    </span>
                  </div>
                  <div className="mx-3.5 h-px bg-[var(--cal2-border)]" />

                  {/* Status */}
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className={labelBase}>Статус</span>
                    <button
                      type="button"
                      onClick={() => { void handleToggleStatus(); }}
                      disabled={isTogglingStatus}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${
                        (event.status ?? "pending") === "done"
                          ? "bg-[rgba(74,222,128,0.12)] text-[#4ADE80]"
                          : "bg-[rgba(251,191,36,0.12)] text-[#FBBF24]"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        (event.status ?? "pending") === "done" ? "bg-[#4ADE80]" : "bg-[#FBBF24]"
                      }`} />
                      {isTogglingStatus ? "..." : getStatusLabel(event.status ?? "pending")}
                    </button>
                  </div>
                  <div className="mx-3.5 h-px bg-[var(--cal2-border)]" />

                  {/* Priority */}
                  <div className="flex items-center justify-between px-3.5 py-2">
                    <span className={labelBase}>Приоритет</span>
                    <div className="flex items-center gap-0.5">
                      {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG.urgent][]).map(
                        ([key, config]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => onPriorityChange?.(event.id, key)}
                            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all duration-150 ${
                              currentPriority === key
                                ? "bg-[rgba(255,255,255,0.06)] text-[var(--cal2-text-primary)]"
                                : "text-[var(--cal2-text-disabled)] hover:text-[var(--cal2-text-secondary)]"
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full transition-all ${
                              currentPriority === key ? PRIORITY_DOTS[key].dotActive : PRIORITY_DOTS[key].dot
                            }`} />
                            {currentPriority === key && config.label}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Category */}
                  {event.categoryId && categories.length > 0 && (() => {
                    const cat = categories.find((c) => c.id === event.categoryId);
                    if (!cat) return null;
                    return (
                      <>
                        <div className="mx-3.5 h-px bg-[var(--cal2-border)]" />
                        <div className="flex items-center justify-between px-3.5 py-2.5">
                          <span className={labelBase}>Категория</span>
                          <span className="flex items-center gap-1.5 text-[12px] text-[var(--cal2-text-primary)]">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.label}
                          </span>
                        </div>
                      </>
                    );
                  })()}

                  {/* Recurrence info */}
                  {event.recurrence && (
                    <>
                      <div className="mx-3.5 h-px bg-[var(--cal2-border)]" />
                      <div className="flex items-center justify-between px-3.5 py-2.5">
                        <span className={labelBase}>Повтор</span>
                        <span className="text-[12px] text-[var(--cal2-text-primary)]">
                          {event.recurrence.frequency === "daily" && "Ежедневно"}
                          {event.recurrence.frequency === "weekly" && "Еженедельно"}
                          {event.recurrence.frequency === "monthly" && "Ежемесячно"}
                          {event.recurrence.interval > 1 && ` ×${event.recurrence.interval}`}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* ── Description ── */}
                {event.description.trim() ? (
                  <div className="mt-4 rounded-lg bg-[var(--cal2-surface-1)] px-3.5 py-3">
                    <p className={`${labelBase} mb-1.5`}>Описание</p>
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--cal2-text-primary)]">
                      {event.description.trim()}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 px-1 text-[12px] italic text-[var(--cal2-text-disabled)]">
                    Описание не добавлено
                  </p>
                )}

                {/* ── Error ── */}
                {submitError && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.06)] px-3 py-2.5 text-[12px] text-[#F87171]">
                    <span className="text-[14px] leading-none">✕</span>
                    {submitError}
                  </div>
                )}

                {/* ── Scope selector for recurring ── */}
                {hasRecurringSeries && <div className="mt-4">{renderScopeSelector()}</div>}

                {/* ── Linked entities ── */}
                {renderLinkedEntities()}

                {/* ── Convert actions ── */}
                {(onConvertToTask ?? onConvertToEvent ?? onConvertToNote) && (
                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    <span className={`${labelBase} mr-1`}>Конвертация</span>
                    {event.type === "event" && onConvertToTask && (
                      <button
                        type="button"
                        onClick={() => { void handleConvertToTask(); }}
                        disabled={isConverting}
                        className="rounded-md px-2.5 py-1 text-[11px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:text-[var(--cal2-text-disabled)]"
                      >
                        {isConverting ? "..." : "→ Задача"}
                      </button>
                    )}
                    {event.type === "task" && onConvertToEvent && (
                      <button
                        type="button"
                        onClick={() => { void handleConvertToEvent(); }}
                        disabled={isConverting}
                        className="rounded-md px-2.5 py-1 text-[11px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:text-[var(--cal2-text-disabled)]"
                      >
                        {isConverting ? "..." : "→ Событие"}
                      </button>
                    )}
                    {onConvertToNote && (
                      <button
                        type="button"
                        onClick={() => { void handleConvertToNote(); }}
                        disabled={isConverting}
                        className="rounded-md px-2.5 py-1 text-[11px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:text-[var(--cal2-text-disabled)]"
                      >
                        {isConverting ? "..." : "→ Заметка"}
                      </button>
                    )}
                  </div>
                )}

                {/* ── Main actions ── */}
                <div className="mt-5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { void handleToggleStatus(); }}
                    disabled={isTogglingStatus}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
                      nextStatus === "done"
                        ? "bg-[rgba(74,222,128,0.1)] text-[#4ADE80] hover:bg-[rgba(74,222,128,0.16)]"
                        : "bg-[rgba(251,191,36,0.1)] text-[#FBBF24] hover:bg-[rgba(251,191,36,0.16)]"
                    }`}
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
                    className="rounded-lg px-4 py-2 text-[13px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--cal2-text-primary)]"
                  >
                    Редактировать
                  </button>

                  <div className="flex-1" />

                  <button
                    type="button"
                    onClick={() => { void handleDelete(); }}
                    disabled={isDeleting}
                    className="rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--cal2-text-disabled)] transition-colors hover:bg-[rgba(248,113,113,0.08)] hover:text-[#F87171] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isDeleting ? "..." : "Удалить"}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--cal2-text-disabled)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--cal2-text-secondary)]"
                    aria-label="Закрыть"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </>
            )
          ) : (
            <>
              {/* ── Create mode ── */}
              <div className="mb-5 flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--cal2-accent-soft)] text-[11px] font-bold text-[var(--cal2-accent)]">
                  +
                </span>
                <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--cal2-text-primary)]">
                  Новое событие
                </h2>
              </div>
              {renderForm("Создать", handleCreateSubmit, onClose)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
