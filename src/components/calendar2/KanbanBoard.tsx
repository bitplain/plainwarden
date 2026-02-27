"use client";

import { DragEvent, useState } from "react";
import type { CalendarEvent } from "@/lib/types";
import {
  KANBAN_COLUMNS,
  PRIORITY_CONFIG,
  type KanbanCard,
  type KanbanColumn,
  type TaskPriority,
} from "./calendar2-types";

interface KanbanBoardProps {
  cards: KanbanCard[];
  events: CalendarEvent[];
  onAddCard: (input: {
    title: string;
    description: string;
    column: KanbanColumn;
    priority: TaskPriority;
    linkedEventId?: string;
  }) => void;
  onMoveCard: (id: string, column: KanbanColumn) => void;
  onDeleteCard: (id: string) => void;
}

interface AddCardFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  linkedEventId: string;
}

const EMPTY_FORM: AddCardFormData = {
  title: "",
  description: "",
  priority: "medium",
  linkedEventId: "",
};

export default function KanbanBoard({
  cards,
  events,
  onAddCard,
  onMoveCard,
  onDeleteCard,
}: KanbanBoardProps) {
  const [addingToColumn, setAddingToColumn] = useState<KanbanColumn | null>(null);
  const [form, setForm] = useState<AddCardFormData>({ ...EMPTY_FORM });
  const [formError, setFormError] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumn | null>(null);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, cardId: string) => {
    setDraggedCardId(cardId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", cardId);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, column: KanbanColumn) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(column);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, column: KanbanColumn) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/plain");
    if (cardId) {
      onMoveCard(cardId, column);
    }
    setDraggedCardId(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
    setDragOverColumn(null);
  };

  const handleAddCard = (column: KanbanColumn) => {
    setFormError(null);

    if (!form.title.trim()) {
      setFormError("Укажите название");
      return;
    }

    if (form.title.trim().length > 100) {
      setFormError("Название должно быть короче 100 символов");
      return;
    }

    onAddCard({
      title: form.title.trim(),
      description: form.description.trim(),
      column,
      priority: form.priority,
      linkedEventId: form.linkedEventId || undefined,
    });

    setForm({ ...EMPTY_FORM });
    setAddingToColumn(null);
  };

  const getLinkedEventTitle = (eventId?: string): string | null => {
    if (!eventId) {
      return null;
    }
    const event = events.find((e) => e.id === eventId);
    return event?.title ?? null;
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)]">
      <div className="border-b border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-4 py-3">
        <p className="text-[13px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)]">Канбан-доска</p>
        <p className="text-[11px] text-[var(--cal2-text-secondary)]">Перетащите карточки между колонками</p>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto p-3">
        <div className="grid min-w-[900px] grid-cols-4 gap-3">
          {KANBAN_COLUMNS.map((column) => {
            const columnCards = cards.filter((c) => c.column === column.id);
            const isDragOver = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`flex flex-col rounded-[8px] border p-2.5 transition-colors ${
                  isDragOver
                    ? "border-[rgba(94,106,210,0.42)] bg-[var(--cal2-accent-soft)]"
                    : "border-[var(--cal2-border)] bg-[var(--cal2-surface-2)]"
                }`}
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)]">{column.label}</h3>
                    <span className="rounded-[4px] border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--cal2-text-secondary)]">
                      {columnCards.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (addingToColumn === column.id) {
                        setAddingToColumn(null);
                        setForm({ ...EMPTY_FORM });
                        setFormError(null);
                      } else {
                        setAddingToColumn(column.id);
                        setForm({ ...EMPTY_FORM });
                        setFormError(null);
                      }
                    }}
                    className="rounded-[4px] px-1.5 py-0.5 text-[11px] text-[var(--cal2-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--cal2-text-primary)]"
                  >
                    +
                  </button>
                </div>

                {/* Add card form */}
                {addingToColumn === column.id && (
                  <div className="mb-2.5 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] p-2.5">
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Название задачи"
                        value={form.title}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                        className="h-8 w-full rounded-[4px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 text-[12px] text-[var(--cal2-text-primary)] outline-none placeholder:text-[var(--cal2-text-disabled)] focus:border-[rgba(94,106,210,0.42)]"
                      />

                      <textarea
                        placeholder="Описание"
                        value={form.description}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, description: e.target.value }))
                        }
                        className="min-h-14 w-full rounded-[4px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1.5 text-[12px] text-[var(--cal2-text-primary)] outline-none placeholder:text-[var(--cal2-text-disabled)] focus:border-[rgba(94,106,210,0.42)]"
                      />

                      <select
                        value={form.priority}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            priority: e.target.value as TaskPriority,
                          }))
                        }
                        className="h-8 w-full rounded-[4px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
                      >
                        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                          <option key={key} value={key}>
                            {config.label}
                          </option>
                        ))}
                      </select>

                      {events.length > 0 && (
                        <select
                          value={form.linkedEventId}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              linkedEventId: e.target.value,
                            }))
                          }
                          className="h-8 w-full rounded-[4px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
                        >
                          <option value="">Без привязки к событию</option>
                          {events.map((event) => (
                            <option key={event.id} value={event.id}>
                              {event.title} ({event.date})
                            </option>
                          ))}
                        </select>
                      )}

                      {formError && (
                        <p className="text-[11px] text-[#d9ddff]">{formError}</p>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddCard(column.id)}
                          className="flex-1 rounded-[4px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent-soft)] py-1.5 text-[11px] font-medium text-[var(--cal2-text-primary)] transition-colors hover:bg-[var(--cal2-accent-soft-strong)]"
                        >
                          Создать
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingToColumn(null);
                            setFormError(null);
                          }}
                          className="flex-1 rounded-[4px] border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.04)] py-1.5 text-[11px] text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cards */}
                <div className="space-y-2 overflow-y-auto">
                  {columnCards.length === 0 && !addingToColumn && (
                    <p className="py-4 text-center text-[11px] text-[var(--cal2-text-secondary)]">Пусто</p>
                  )}

                  {columnCards.map((card) => {
                    const priorityConfig = PRIORITY_CONFIG[card.priority];
                    const linkedTitle = getLinkedEventTitle(card.linkedEventId);
                    const isDragging = draggedCardId === card.id;

                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, card.id)}
                        onDragEnd={handleDragEnd}
                        className={`cursor-grab rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] p-2.5 transition-colors hover:bg-[rgba(255,255,255,0.04)] active:cursor-grabbing ${
                          isDragging ? "opacity-40" : "opacity-100"
                        }`}
                      >
                        <div className="mb-1.5 flex items-start justify-between gap-2">
                          <p className="text-[13px] font-medium leading-[1.2] text-[var(--cal2-text-primary)]">
                            {card.title}
                          </p>
                          <button
                            type="button"
                            onClick={() => onDeleteCard(card.id)}
                            className="flex-shrink-0 text-[11px] text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
                          >
                            ✕
                          </button>
                        </div>

                        {card.description && (
                          <p className="mb-1.5 line-clamp-2 text-[11px] text-[var(--cal2-text-secondary)]">
                            {card.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${priorityConfig.bg} ${priorityConfig.border} ${priorityConfig.color}`}
                          >
                            {priorityConfig.label}
                          </span>

                          {linkedTitle && (
                            <span className="rounded-[4px] border border-[rgba(94,106,210,0.4)] bg-[var(--cal2-accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--cal2-text-primary)]">
                              📅 {linkedTitle}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
