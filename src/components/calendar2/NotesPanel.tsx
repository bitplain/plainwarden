"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { CalendarEvent } from "@/lib/types";
import { toDateKey } from "@/components/calendar2/date-utils";
import { CALENDAR2_RESPONSIVE_PANEL_FRAME_CLASSNAME } from "./mobile-layout";
import type { Note } from "./calendar2-types";

interface NotesPanelProps {
  notes: Note[];
  events: CalendarEvent[];
  anchorDate: Date;
  loading?: boolean;
  error?: string | null;
  onAddNote: (input: {
    title: string;
    content: string;
    linkedDate?: string;
    linkedEventId?: string;
  }) => Promise<void> | void;
  onUpdateNote: (id: string, updates: { title?: string; content?: string }) => Promise<void> | void;
  onDeleteNote: (id: string) => Promise<void> | void;
}

type NoteFilter = "all" | "date" | "event";

interface AddNoteFormData {
  title: string;
  content: string;
  linkedDate: string;
  linkedEventId: string;
}

const EMPTY_FORM: AddNoteFormData = {
  title: "",
  content: "",
  linkedDate: "",
  linkedEventId: "",
};

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-[12px] font-bold text-[var(--cal2-text-primary)] mt-2 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-[13px] font-bold text-[var(--cal2-text-primary)] mt-2 mb-1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-[14px] font-bold text-[var(--cal2-text-primary)] mt-2 mb-1">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--cal2-text-primary)]">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="rounded-[4px] border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.06)] px-1 py-0.5 text-[var(--cal2-text-primary)] text-[10px]">$1</code>');

  // Unordered lists
  html = html.replace(
    /^[*-] (.+)$/gm,
    '<li class="ml-4 list-disc text-[var(--cal2-text-primary)]">$1</li>',
  );

  // Links — only allow http/https protocols to prevent XSS
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#cfd4ff] underline hover:text-[var(--cal2-text-primary)]">$1</a>',
  );

  // Line breaks
  html = html.replace(/\n/g, "<br />");

  return html;
}

export default function NotesPanel({
  notes,
  events,
  anchorDate,
  loading = false,
  error = null,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: NotesPanelProps) {
  const dateKey = toDateKey(anchorDate);
  const [filter, setFilter] = useState<NoteFilter>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddNoteFormData>({ ...EMPTY_FORM });
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [previewNoteId, setPreviewNoteId] = useState<string | null>(null);

  const filteredNotes = useMemo(() => {
    switch (filter) {
      case "date":
        return notes.filter((n) => n.linkedDate === dateKey);
      case "event":
        return notes.filter((n) => n.linkedEventId);
      default:
        return notes;
    }
  }, [notes, filter, dateKey]);

  const handleAddNote = async () => {
    setFormError(null);

    if (!form.title.trim()) {
      setFormError("Укажите название");
      return;
    }

    if (form.title.trim().length > 100) {
      setFormError("Название должно быть короче 100 символов");
      return;
    }

    try {
      await onAddNote({
        title: form.title.trim(),
        content: form.content,
        linkedDate: form.linkedDate || undefined,
        linkedEventId: form.linkedEventId || undefined,
      });

      setForm({ ...EMPTY_FORM });
      setShowForm(false);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Не удалось сохранить заметку");
    }
  };

  const handleSaveEdit = async (id: string) => {
    setFormError(null);

    try {
      await onUpdateNote(id, { content: editContent });
      setEditingId(null);
      setEditContent("");
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Не удалось обновить заметку");
    }
  };

  const getLinkedEventTitle = (eventId?: string): string | null => {
    if (!eventId) {
      return null;
    }
    return events.find((e) => e.id === eventId)?.title ?? null;
  };

  return (
    <div className={CALENDAR2_RESPONSIVE_PANEL_FRAME_CLASSNAME}>
      <div className="flex items-center justify-between border-b border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-4 py-3">
        <div>
          <p className="text-[13px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)]">Заметки</p>
          <p className="text-[11px] text-[var(--cal2-text-secondary)]">
            {filteredNotes.length} {filteredNotes.length === 1 ? "заметка" : "заметок"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] p-0.5">
            {(
              [
                { id: "all", label: "Все" },
                { id: "date", label: "По дате" },
                { id: "event", label: "Привязанные" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={`rounded-[4px] px-2 py-1 text-[11px] font-medium transition-colors ${
                  filter === opt.id
                    ? "border border-[rgba(94,106,210,0.42)] bg-[var(--cal2-accent-soft)] text-[var(--cal2-text-primary)]"
                    : "text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded-[6px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent-soft)] px-3 py-1.5 text-[11px] font-medium text-[var(--cal2-text-primary)] transition-colors hover:bg-[var(--cal2-accent-soft-strong)]"
          >
            {showForm ? "Отмена" : "+ Заметка"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && (
          <div className="border-b border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-4 py-3">
            <p className="text-[11px] text-[#d9ddff]">{error}</p>
          </div>
        )}

        {/* Add note form */}
        {showForm && (
          <div className="border-b border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-4">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Заголовок"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="h-9 w-full rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none placeholder:text-[var(--cal2-text-disabled)] focus:border-[rgba(94,106,210,0.42)]"
              />

              <textarea
                placeholder="Содержание (поддерживается Markdown: **жирный**, *курсив*, # заголовок, - список, `код`, [ссылка](url))"
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                rows={6}
                className="w-full rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2 text-[12px] text-[var(--cal2-text-primary)] outline-none placeholder:text-[var(--cal2-text-disabled)] focus:border-[rgba(94,106,210,0.42)]"
              />

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-[11px] text-[var(--cal2-text-secondary)]">Привязать к дате</span>
                  <input
                    type="date"
                    value={form.linkedDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, linkedDate: e.target.value }))
                    }
                    className="h-9 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
                  />
                </label>

                {events.length > 0 && (
                  <label className="grid gap-1">
                    <span className="text-[11px] text-[var(--cal2-text-secondary)]">Привязать к событию</span>
                    <select
                      value={form.linkedEventId}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          linkedEventId: e.target.value,
                        }))
                      }
                      className="h-9 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
                    >
                      <option value="">Без привязки</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              {formError && <p className="text-[11px] text-[#d9ddff]">{formError}</p>}

              <button
                type="button"
                onClick={() => {
                  void handleAddNote();
                }}
                className="w-full rounded-[6px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent-soft)] py-2 text-[12px] font-medium text-[var(--cal2-text-primary)] transition-colors hover:bg-[var(--cal2-accent-soft-strong)]"
              >
                Сохранить заметку
              </button>
            </div>
          </div>
        )}

        {/* Notes list */}
        <div className="space-y-2 p-3 sm:p-4">
          {loading && filteredNotes.length === 0 && (
            <div className="rounded-[8px] border border-dashed border-[var(--cal2-border)] p-6 text-center">
              <p className="text-[12px] text-[var(--cal2-text-secondary)]">Загружаю заметки...</p>
            </div>
          )}

          {!loading && filteredNotes.length === 0 && (
            <div className="rounded-[8px] border border-dashed border-[var(--cal2-border)] p-6 text-center">
              <p className="text-[12px] text-[var(--cal2-text-secondary)]">
                {filter === "date"
                  ? `Нет заметок на ${format(anchorDate, "d MMMM", { locale: ru })}`
                  : filter === "event"
                    ? "Нет привязанных к событиям заметок"
                    : "Заметки пока не созданы"}
              </p>
            </div>
          )}

          {filteredNotes.map((note) => {
            const linkedTitle = getLinkedEventTitle(note.linkedEventId);
            const isEditing = editingId === note.id;
            const isPreviewing = previewNoteId === note.id;

            return (
              <div
                key={note.id}
                className="rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-3 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[13px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)]">{note.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {note.linkedDate && (
                        <span className="rounded-[4px] border border-[rgba(94,106,210,0.42)] bg-[var(--cal2-accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--cal2-text-primary)]">
                          📅 {note.linkedDate}
                        </span>
                      )}
                      {linkedTitle && (
                        <span className="rounded-[4px] border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 text-[10px] text-[var(--cal2-text-primary)]">
                          🔗 {linkedTitle}
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--cal2-text-secondary)]">
                        {format(new Date(note.updatedAt), "d MMM HH:mm", { locale: ru })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (isPreviewing) {
                          setPreviewNoteId(null);
                        } else {
                          setPreviewNoteId(note.id);
                        }
                      }}
                      className="rounded-[4px] px-1.5 py-0.5 text-[10px] text-[var(--cal2-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--cal2-text-primary)]"
                    >
                      {isPreviewing ? "Скрыть" : "Просмотр"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditing) {
                          setEditingId(null);
                        } else {
                          setEditingId(note.id);
                          setEditContent(note.content);
                        }
                      }}
                      className="rounded-[4px] px-1.5 py-0.5 text-[10px] text-[var(--cal2-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--cal2-text-primary)]"
                    >
                      {isEditing ? "Отмена" : "✎"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void onDeleteNote(note.id);
                      }}
                      className="rounded-[4px] px-1.5 py-0.5 text-[10px] text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={6}
                      className="w-full rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 py-2 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void handleSaveEdit(note.id);
                      }}
                      className="rounded-[6px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent-soft)] px-4 py-1.5 text-[11px] font-medium text-[var(--cal2-text-primary)] transition-colors hover:bg-[var(--cal2-accent-soft-strong)]"
                    >
                      Сохранить
                    </button>
                  </div>
                ) : isPreviewing ? (
                  <div
                    className="prose-sm mt-2 text-[12px] text-[var(--cal2-text-secondary)]"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }}
                  />
                ) : (
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[12px] text-[var(--cal2-text-secondary)]">
                    {note.content}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
