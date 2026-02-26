"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

const NOTES_STORAGE_KEY = "netden:notes:v1";

interface LocalNote {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNotes(): LocalNote[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(NOTES_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isRecord)
      .map((item) => {
        const id = typeof item.id === "string" ? item.id : "";
        const title = typeof item.title === "string" ? item.title : "";
        const body = typeof item.body === "string" ? item.body : "";
        const updatedAt = typeof item.updatedAt === "string" ? item.updatedAt : "";

        if (!id || !title || !updatedAt) {
          return null;
        }

        return {
          id,
          title,
          body,
          updatedAt,
        } satisfies LocalNote;
      })
      .filter((item): item is LocalNote => item !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function writeNotes(notes: LocalNote[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
}

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function NotesPage() {
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      setIsEmbedded(params.get("embedded") === "1");
      setNotes(readNotes());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const total = notes.length;

  const latestLabel = useMemo(() => {
    if (!notes[0]) return "Нет заметок";
    return `Обновлено ${formatDateLabel(notes[0].updatedAt)}`;
  }, [notes]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    const normalizedBody = body.trim();

    if (!normalizedTitle) {
      setError("Укажите заголовок заметки.");
      return;
    }

    const nextNote: LocalNote = {
      id: crypto.randomUUID(),
      title: normalizedTitle,
      body: normalizedBody,
      updatedAt: new Date().toISOString(),
    };

    const next = [nextNote, ...notes];
    setNotes(next);
    writeNotes(next);

    setTitle("");
    setBody("");
    setError(null);
  };

  const onDelete = (id: string) => {
    const next = notes.filter((note) => note.id !== id);
    setNotes(next);
    writeNotes(next);
  };

  return (
    <div className={`home-page-shell ${isEmbedded ? "home-page-shell-embedded" : ""}`}>
      <div className={`home-page-grid ${isEmbedded ? "home-page-grid-embedded" : ""}`}>
        <header className="home-header">
          <div>
            <p className="home-kicker">NetDen</p>
            <h1 className="home-title">Заметки</h1>
            <p className="home-subtitle">
              Локальные заметки в браузере. Всего: {total}. {latestLabel}.
            </p>
          </div>
          {!isEmbedded ? (
            <nav className="home-links">
              <Link href="/" className="home-link">
                Консоль
              </Link>
              <Link href="/home" className="home-link">
                Главная
              </Link>
              <Link href="/settings" className="home-link">
                Настройки
              </Link>
            </nav>
          ) : null}
        </header>

        <section className="home-card">
          <h2 className="home-card-title">Новая заметка</h2>

          <form className="notes-form" onSubmit={onSubmit}>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Заголовок"
              className="notes-input"
              maxLength={80}
            />
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Текст заметки"
              className="notes-textarea"
              rows={4}
              maxLength={2000}
            />
            {error ? <p className="notes-error">{error}</p> : null}
            <button type="submit" className="notes-submit">
              Сохранить
            </button>
          </form>
        </section>

        <section className="home-card">
          <h2 className="home-card-title">Список</h2>

          {notes.length === 0 ? (
            <p className="home-muted">Пока пусто. Добавьте первую заметку.</p>
          ) : (
            <ul className="notes-list">
              {notes.map((note) => (
                <li key={note.id} className="notes-item">
                  <div>
                    <p className="notes-item-title">{note.title}</p>
                    {note.body ? <p className="notes-item-body">{note.body}</p> : null}
                    <p className="notes-item-date">{formatDateLabel(note.updatedAt)}</p>
                  </div>
                  <button
                    type="button"
                    className="notes-delete"
                    onClick={() => onDelete(note.id)}
                    aria-label={`Удалить заметку ${note.title}`}
                  >
                    Удалить
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
