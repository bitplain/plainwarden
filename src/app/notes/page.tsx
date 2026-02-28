"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Note, NoteVersion } from "@/lib/types";

const VERSION_PREVIEW_LENGTH = 120;

// ── Wikilink renderer ──────────────────────────────────────────────────────────

function renderBodyWithWikilinks(
  body: string,
  notes: Note[],
  onNavigate: (id: string) => void,
): React.ReactNode[] {
  const parts = body.split(/(\[\[[^\]]+\]\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[\[(.+)\]\]$/);
    if (match) {
      const title = match[1].trim();
      const target = notes.find((n) => n.title.toLowerCase() === title.toLowerCase());
      if (target) {
        return (
          <button
            key={i}
            type="button"
            className="notes-wikilink"
            onClick={() => onNavigate(target.id)}
          >
            {title}
          </button>
        );
      }
      return (
        <span key={i} className="notes-wikilink-dead">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function NotesPage() {
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search / filter
  const [searchQ, setSearchQ] = useState("");
  const [filterTag, setFilterTag] = useState("");

  // Selected note for detail view
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Create-note form
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // History panel
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<NoteVersion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Preview mode
  const [preview, setPreview] = useState(false);

  // ── Load notes ───────────────────────────────────────────────────────────────

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: { q?: string; tag?: string } = {};
      if (searchQ.trim()) filters.q = searchQ.trim();
      if (filterTag.trim()) filters.tag = filterTag.trim();
      const data = await api.getNotes(filters);
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  }, [searchQ, filterTag]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      setIsEmbedded(params.get("embedded") === "1");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  // ── Derived state ─────────────────────────────────────────────────────────────

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [notes]);

  const rootNotes = useMemo(() => notes.filter((n) => !n.parentId), [notes]);

  // ── Select note ───────────────────────────────────────────────────────────────

  const selectNote = useCallback((id: string) => {
    setSelectedId(id);
    setEditing(false);
    setShowHistory(false);
    setPreview(false);
  }, []);

  // ── Create ────────────────────────────────────────────────────────────────────

  const onCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) {
      setCreateError("Укажите заголовок.");
      return;
    }
    setCreateError(null);
    setCreateLoading(true);
    try {
      const tags = newTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const created = await api.createNote({
        title,
        body: newBody,
        parentId: newParentId || undefined,
        tags,
      });
      setNotes((prev) => [created, ...prev]);
      setNewTitle("");
      setNewBody("");
      setNewTags("");
      setNewParentId("");
      setShowCreate(false);
      selectNote(created.id);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Ошибка создания");
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────────

  const startEdit = () => {
    if (!selectedNote) return;
    setEditTitle(selectedNote.title);
    setEditBody(selectedNote.body);
    setEditTags(selectedNote.tags.join(", "));
    setEditParentId(selectedNote.parentId ?? "");
    setEditing(true);
    setEditError(null);
    setPreview(false);
  };

  const onEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedNote) return;
    const title = editTitle.trim();
    if (!title) {
      setEditError("Заголовок не может быть пустым.");
      return;
    }
    setEditError(null);
    setEditLoading(true);
    try {
      const tags = editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const updated = await api.updateNote(selectedNote.id, {
        title,
        body: editBody,
        tags,
        parentId: editParentId || null,
      });
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setEditLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  const onDelete = async () => {
    if (!selectedNote) return;
    if (!window.confirm(`Удалить заметку «${selectedNote.title}»?`)) return;
    try {
      await api.deleteNote(selectedNote.id);
      setNotes((prev) => prev.filter((n) => n.id !== selectedNote.id));
      setSelectedId(null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    }
  };

  // ── History ───────────────────────────────────────────────────────────────────

  const openHistory = async () => {
    if (!selectedNote) return;
    setHistoryLoading(true);
    setShowHistory(true);
    try {
      const data = await api.getNoteHistory(selectedNote.id);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки истории");
    } finally {
      setHistoryLoading(false);
    }
  };

  const onRestore = async (versionId: string) => {
    if (!selectedNote) return;
    if (!window.confirm("Восстановить эту версию?")) return;
    try {
      const updated = await api.restoreNoteVersion(selectedNote.id, versionId);
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setShowHistory(false);
      setHistory([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка восстановления");
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────────

  const onExport = () => {
    if (!selectedNote) return;
    const url = api.getNoteExportUrl(selectedNote.id);
    window.open(url, "_blank");
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={`home-page-shell ${isEmbedded ? "home-page-shell-embedded" : ""}`}>
      <div className={`home-page-grid ${isEmbedded ? "home-page-grid-embedded" : ""}`}>
        {/* Header */}
        <header className="home-header">
          <div className="home-header-left">
            {!isEmbedded ? (
              <Link href="/" className="home-back-link">
                ← Консоль
              </Link>
            ) : null}
            <div>
              <p className="home-kicker">NetDen</p>
              <h1 className="home-title">Заметки</h1>
              <p className="home-subtitle">База знаний. Всего: {notes.length}.</p>
            </div>
          </div>
          {!isEmbedded ? (
            <nav className="home-links">
              <Link href="/home" className="home-link">
                Главная
              </Link>
              <Link href="/settings" className="home-link">
                Настройки
              </Link>
            </nav>
          ) : null}
        </header>

        {/* Global error */}
        {error ? (
          <p className="notes-error" style={{ margin: "0 0 0.5rem" }}>
            {error}
          </p>
        ) : null}

        <div className="notes-workspace">
          {/* Sidebar */}
          <aside className="notes-sidebar">
            {/* Search + tag filter */}
            <div className="notes-search-bar">
              <input
                className="notes-input"
                placeholder="Поиск..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
              {allTags.length > 0 ? (
                <select
                  className="notes-input"
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                >
                  <option value="">Все теги</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>
                      #{tag}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            <button
              type="button"
              className="notes-submit"
              onClick={() => {
                setShowCreate((v) => !v);
                setCreateError(null);
              }}
            >
              {showCreate ? "Отмена" : "+ Новая заметка"}
            </button>

            {showCreate ? (
              <form className="notes-form" onSubmit={onCreateSubmit}>
                <input
                  className="notes-input"
                  placeholder="Заголовок"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  maxLength={200}
                />
                <textarea
                  className="notes-textarea"
                  placeholder="Текст (Markdown, [[Wikilinks]])"
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  rows={4}
                />
                <input
                  className="notes-input"
                  placeholder="Теги (через запятую)"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                />
                <select
                  className="notes-input"
                  value={newParentId}
                  onChange={(e) => setNewParentId(e.target.value)}
                >
                  <option value="">Без родителя (корень)</option>
                  {notes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title}
                    </option>
                  ))}
                </select>
                {createError ? <p className="notes-error">{createError}</p> : null}
                <button type="submit" className="notes-submit" disabled={createLoading}>
                  {createLoading ? "Сохранение..." : "Создать"}
                </button>
              </form>
            ) : null}

            {/* Tree */}
            {isLoading ? (
              <p className="home-muted">Загрузка...</p>
            ) : notes.length === 0 ? (
              <p className="home-muted">Заметок нет.</p>
            ) : (
              <NoteTree
                nodes={rootNotes}
                allNotes={notes}
                selectedId={selectedId}
                onSelect={selectNote}
              />
            )}
          </aside>

          {/* Detail pane */}
          <main className="notes-detail">
            {!selectedNote ? (
              <p className="home-muted" style={{ padding: "1rem" }}>
                Выберите заметку из списка.
              </p>
            ) : showHistory ? (
              <HistoryPanel
                note={selectedNote}
                history={history}
                loading={historyLoading}
                onClose={() => setShowHistory(false)}
                onRestore={onRestore}
              />
            ) : editing ? (
              <EditForm
                note={selectedNote}
                editTitle={editTitle}
                editBody={editBody}
                editTags={editTags}
                editParentId={editParentId}
                editError={editError}
                editLoading={editLoading}
                allNotes={notes}
                onTitleChange={setEditTitle}
                onBodyChange={setEditBody}
                onTagsChange={setEditTags}
                onParentChange={setEditParentId}
                onSubmit={onEditSubmit}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <NoteDetail
                note={selectedNote}
                allNotes={notes}
                preview={preview}
                onPreviewToggle={() => setPreview((v) => !v)}
                onEdit={startEdit}
                onDelete={onDelete}
                onHistory={openHistory}
                onExport={onExport}
                onNavigate={selectNote}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function NoteTree({
  nodes,
  allNotes,
  selectedId,
  onSelect,
}: {
  nodes: Note[];
  allNotes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="notes-tree">
      {nodes.map((note) => {
        const childNotes = allNotes.filter((n) => n.parentId === note.id);
        return (
          <li key={note.id} className="notes-tree-item">
            <button
              type="button"
              className={`notes-tree-btn ${selectedId === note.id ? "notes-tree-btn-active" : ""}`}
              onClick={() => onSelect(note.id)}
            >
              {note.title}
              {note.tags.length > 0 ? (
                <span className="notes-tree-tags">
                  {note.tags.map((t) => (
                    <span key={t} className="notes-tag">
                      #{t}
                    </span>
                  ))}
                </span>
              ) : null}
            </button>
            {childNotes.length > 0 ? (
              <NoteTree
                nodes={childNotes}
                allNotes={allNotes}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function NoteDetail({
  note,
  allNotes,
  preview,
  onPreviewToggle,
  onEdit,
  onDelete,
  onHistory,
  onExport,
  onNavigate,
}: {
  note: Note;
  allNotes: Note[];
  preview: boolean;
  onPreviewToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onHistory: () => void;
  onExport: () => void;
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="notes-detail-inner">
      <div className="notes-detail-header">
        <div>
          <p className="notes-item-title" style={{ fontSize: "1.05rem" }}>
            {note.title}
          </p>
          {note.tags.length > 0 ? (
            <div className="notes-tags-row">
              {note.tags.map((t) => (
                <span key={t} className="notes-tag">
                  #{t}
                </span>
              ))}
            </div>
          ) : null}
          <p className="notes-item-date">
            Изменено: {formatDateLabel(note.updatedAt)} · Создано: {formatDateLabel(note.createdAt)}
          </p>
        </div>
        <div className="notes-detail-actions">
          <button type="button" className="notes-submit" onClick={onPreviewToggle}>
            {preview ? "Исходник" : "Preview"}
          </button>
          <button type="button" className="notes-submit" onClick={onEdit}>
            Изменить
          </button>
          <button type="button" className="notes-submit" onClick={onHistory}>
            История
          </button>
          <button type="button" className="notes-submit" onClick={onExport}>
            Экспорт
          </button>
          <button type="button" className="notes-delete" onClick={onDelete}>
            Удалить
          </button>
        </div>
      </div>

      {note.body ? (
        <div className="notes-body-area">
          {preview ? (
            <div className="notes-preview">
              {renderBodyWithWikilinks(note.body, allNotes, onNavigate)}
            </div>
          ) : (
            <pre className="notes-raw">{note.body}</pre>
          )}
        </div>
      ) : (
        <p className="home-muted" style={{ padding: "0.5rem 0" }}>
          Заметка пуста.
        </p>
      )}

      {note.backlinks && note.backlinks.length > 0 ? (
        <div className="notes-backlinks">
          <p className="notes-section-title">Backlinks</p>
          <ul className="notes-backlink-list">
            {note.backlinks.map((bl) => (
              <li key={bl.id}>
                <button
                  type="button"
                  className="notes-wikilink"
                  onClick={() => onNavigate(bl.id)}
                >
                  {bl.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {note.children && note.children.length > 0 ? (
        <div className="notes-backlinks">
          <p className="notes-section-title">Дочерние заметки</p>
          <ul className="notes-backlink-list">
            {note.children.map((ch) => (
              <li key={ch.id}>
                <button
                  type="button"
                  className="notes-wikilink"
                  onClick={() => onNavigate(ch.id)}
                >
                  {ch.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function EditForm({
  note,
  editTitle,
  editBody,
  editTags,
  editParentId,
  editError,
  editLoading,
  allNotes,
  onTitleChange,
  onBodyChange,
  onTagsChange,
  onParentChange,
  onSubmit,
  onCancel,
}: {
  note: Note;
  editTitle: string;
  editBody: string;
  editTags: string;
  editParentId: string;
  editError: string | null;
  editLoading: boolean;
  allNotes: Note[];
  onTitleChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onTagsChange: (v: string) => void;
  onParentChange: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <div className="notes-detail-inner">
      <p className="notes-item-title" style={{ marginBottom: "0.5rem" }}>
        Редактирование: {note.title}
      </p>
      <form className="notes-form" onSubmit={onSubmit}>
        <input
          className="notes-input"
          placeholder="Заголовок"
          value={editTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={200}
        />
        <textarea
          className="notes-textarea"
          placeholder="Текст (Markdown, [[Wikilinks]])"
          value={editBody}
          onChange={(e) => onBodyChange(e.target.value)}
          rows={12}
        />
        <input
          className="notes-input"
          placeholder="Теги (через запятую)"
          value={editTags}
          onChange={(e) => onTagsChange(e.target.value)}
        />
        <select
          className="notes-input"
          value={editParentId}
          onChange={(e) => onParentChange(e.target.value)}
        >
          <option value="">Без родителя (корень)</option>
          {allNotes
            .filter((n) => n.id !== note.id)
            .map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
        </select>
        {editError ? <p className="notes-error">{editError}</p> : null}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" className="notes-submit" disabled={editLoading}>
            {editLoading ? "Сохранение..." : "Сохранить"}
          </button>
          <button type="button" className="notes-submit" onClick={onCancel}>
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}

function HistoryPanel({
  note,
  history,
  loading,
  onClose,
  onRestore,
}: {
  note: Note;
  history: NoteVersion[];
  loading: boolean;
  onClose: () => void;
  onRestore: (versionId: string) => void;
}) {
  return (
    <div className="notes-detail-inner">
      <div className="notes-detail-header">
        <p className="notes-item-title">История версий: {note.title}</p>
        <button type="button" className="notes-submit" onClick={onClose}>
          Закрыть
        </button>
      </div>
      {loading ? (
        <p className="home-muted">Загрузка...</p>
      ) : history.length === 0 ? (
        <p className="home-muted">История пуста.</p>
      ) : (
        <ul className="notes-list">
          {history.map((v) => (
            <li key={v.id} className="notes-item">
              <div>
                <p className="notes-item-title">{v.title}</p>
                <p className="notes-item-body" style={{ maxHeight: "4rem", overflow: "hidden" }}>
                  {v.body.slice(0, VERSION_PREVIEW_LENGTH)}
                  {v.body.length > VERSION_PREVIEW_LENGTH ? "..." : ""}
                </p>
                <p className="notes-item-date">{formatDateLabel(v.createdAt)}</p>
              </div>
              <button
                type="button"
                className="notes-submit"
                onClick={() => onRestore(v.id)}
              >
                Восстановить
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
