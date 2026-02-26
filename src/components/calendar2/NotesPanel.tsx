"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { CalendarEvent } from "@/lib/types";
import { toDateKey } from "@/components/calendar/date-utils";
import type { Note } from "./calendar2-types";

interface NotesPanelProps {
  notes: Note[];
  events: CalendarEvent[];
  anchorDate: Date;
  onAddNote: (input: {
    title: string;
    content: string;
    linkedDate?: string;
    linkedEventId?: string;
  }) => void;
  onUpdateNote: (id: string, updates: { title?: string; content?: string }) => void;
  onDeleteNote: (id: string) => void;
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
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-zinc-200 mt-2 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-zinc-200 mt-2 mb-1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-zinc-100 mt-2 mb-1">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-zinc-200">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-white/[0.08] px-1 py-0.5 text-indigo-300 text-xs">$1</code>');

  // Unordered lists
  html = html.replace(
    /^[*-] (.+)$/gm,
    '<li class="ml-4 list-disc text-zinc-300">$1</li>',
  );

  // Links — only allow http/https protocols to prevent XSS
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-400 underline hover:text-indigo-300">$1</a>',
  );

  // Line breaks
  html = html.replace(/\n/g, "<br />");

  return html;
}

export default function NotesPanel({
  notes,
  events,
  anchorDate,
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

  const handleAddNote = () => {
    setFormError(null);

    if (!form.title.trim()) {
      setFormError("Укажите название");
      return;
    }

    if (form.title.trim().length > 100) {
      setFormError("Название должно быть короче 100 символов");
      return;
    }

    onAddNote({
      title: form.title.trim(),
      content: form.content,
      linkedDate: form.linkedDate || undefined,
      linkedEventId: form.linkedEventId || undefined,
    });

    setForm({ ...EMPTY_FORM });
    setShowForm(false);
  };

  const handleSaveEdit = (id: string) => {
    onUpdateNote(id, { content: editContent });
    setEditingId(null);
    setEditContent("");
  };

  const getLinkedEventTitle = (eventId?: string): string | null => {
    if (!eventId) {
      return null;
    }
    return events.find((e) => e.id === eventId)?.title ?? null;
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#12122a]/40">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#16162a]/40 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-zinc-100">Заметки</p>
          <p className="text-xs text-zinc-500">
            {filteredNotes.length} {filteredNotes.length === 1 ? "заметка" : "заметок"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-white/[0.06] bg-black/30 p-0.5">
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
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  filter === opt.id
                    ? "bg-indigo-500/20 text-indigo-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg border border-indigo-400/30 bg-indigo-500/15 px-3 py-1.5 text-xs font-medium text-indigo-200 transition-colors hover:bg-indigo-500/25"
          >
            {showForm ? "Отмена" : "+ Заметка"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Add note form */}
        {showForm && (
          <div className="border-b border-white/[0.06] bg-[#16162a]/30 p-4">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Заголовок"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="h-9 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-400/30"
              />

              <textarea
                placeholder="Содержание (поддерживается Markdown: **жирный**, *курсив*, # заголовок, - список, `код`, [ссылка](url))"
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                rows={6}
                className="w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-400/30"
              />

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-xs text-zinc-500">Привязать к дате</span>
                  <input
                    type="date"
                    value={form.linkedDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, linkedDate: e.target.value }))
                    }
                    className="h-9 rounded-lg border border-white/[0.08] bg-black/30 px-3 text-sm text-zinc-100 outline-none focus:border-indigo-400/30"
                  />
                </label>

                {events.length > 0 && (
                  <label className="grid gap-1">
                    <span className="text-xs text-zinc-500">Привязать к событию</span>
                    <select
                      value={form.linkedEventId}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          linkedEventId: e.target.value,
                        }))
                      }
                      className="h-9 rounded-lg border border-white/[0.08] bg-black/30 px-3 text-sm text-zinc-100 outline-none focus:border-indigo-400/30"
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

              {formError && <p className="text-xs text-red-300">{formError}</p>}

              <button
                type="button"
                onClick={handleAddNote}
                className="w-full rounded-lg border border-indigo-400/30 bg-indigo-500/20 py-2 text-sm font-medium text-indigo-200 transition-colors hover:bg-indigo-500/30"
              >
                Сохранить заметку
              </button>
            </div>
          </div>
        )}

        {/* Notes list */}
        <div className="space-y-2 p-3 sm:p-4">
          {filteredNotes.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center">
              <p className="text-sm text-zinc-600">
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
                className="rounded-xl border border-white/[0.06] bg-[#16162a]/40 p-3 transition-colors hover:border-white/[0.1]"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">{note.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {note.linkedDate && (
                        <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] text-indigo-300">
                          📅 {note.linkedDate}
                        </span>
                      )}
                      {linkedTitle && (
                        <span className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-300">
                          🔗 {linkedTitle}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-600">
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
                      className="rounded-md px-1.5 py-0.5 text-[10px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
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
                      className="rounded-md px-1.5 py-0.5 text-[10px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
                    >
                      {isEditing ? "Отмена" : "✎"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(note.id)}
                      className="rounded-md px-1.5 py-0.5 text-[10px] text-zinc-500 transition-colors hover:text-red-300"
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
                      className="w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-400/30"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(note.id)}
                      className="rounded-lg border border-indigo-400/30 bg-indigo-500/20 px-4 py-1.5 text-xs font-medium text-indigo-200 transition-colors hover:bg-indigo-500/30"
                    >
                      Сохранить
                    </button>
                  </div>
                ) : isPreviewing ? (
                  <div
                    className="prose-sm mt-2 text-sm text-zinc-400"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }}
                  />
                ) : (
                  <p className="mt-1 line-clamp-3 text-sm text-zinc-500 whitespace-pre-wrap">
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
