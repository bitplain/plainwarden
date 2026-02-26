"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useNetdenStore } from "@/lib/store";

const NOTES_STORAGE_KEY = "netden:notes:v1";
const CLI_SCALE_KEY = "netden:cli-scale";
const GITHUB_ORG_KEY = "netden:github:org";
const GITHUB_LAST_SYNC_KEY = "netden:github:last-sync";
const GITHUB_TOKEN_KEY = "netden:github:token";

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
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isRecord)
      .map((item) => {
        if (
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          typeof item.body === "string" &&
          typeof item.updatedAt === "string"
        ) {
          return {
            id: item.id,
            title: item.title,
            body: item.body,
            updatedAt: item.updatedAt,
          } satisfies LocalNote;
        }
        return null;
      })
      .filter((item): item is LocalNote => item !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function formatDate(date: string): string {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return date;
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default function HomeDashboardPage() {
  const [isEmbedded, setIsEmbedded] = useState(false);
  const user = useNetdenStore((state) => state.user);
  const events = useNetdenStore((state) => state.events);
  const bootstrapAuth = useNetdenStore((state) => state.bootstrapAuth);
  const fetchEvents = useNetdenStore((state) => state.fetchEvents);

  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [cliScale, setCliScale] = useState<number | null>(null);
  const [githubOrg, setGithubOrg] = useState<string>("");
  const [githubLastSync, setGithubLastSync] = useState<string>("");
  const [githubConnected, setGithubConnected] = useState(false);

  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);

  useEffect(() => {
    if (!user) return;
    void fetchEvents();
  }, [user, fetchEvents]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      setIsEmbedded(params.get("embedded") === "1");

      setNotes(readNotes());

      const storedScale = window.localStorage.getItem(CLI_SCALE_KEY);
      setCliScale(storedScale ? Number(storedScale) : null);

      const storedOrg = window.localStorage.getItem(GITHUB_ORG_KEY) ?? "";
      const storedSync = window.localStorage.getItem(GITHUB_LAST_SYNC_KEY) ?? "";
      const hasToken = Boolean(window.localStorage.getItem(GITHUB_TOKEN_KEY));
      setGithubOrg(storedOrg);
      setGithubLastSync(storedSync);
      setGithubConnected(hasToken && Boolean(storedOrg));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const upcomingEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => {
        const left = `${a.date}T${a.time ?? "23:59"}`;
        const right = `${b.date}T${b.time ?? "23:59"}`;
        return left.localeCompare(right);
      })
      .slice(0, 5);
  }, [events]);

  const latestNote = notes[0] ?? null;

  return (
    <div className={`home-page-shell ${isEmbedded ? "home-page-shell-embedded" : ""}`}>
      <div className={`home-page-grid ${isEmbedded ? "home-page-grid-embedded" : ""}`}>
        <header className="home-header">
          <div>
            <p className="home-kicker">NetDen</p>
            <h1 className="home-title">Главная</h1>
            <p className="home-subtitle">
              Общий обзор: календарь, заметки, настройки и статус GitHub интеграции.
            </p>
          </div>
          {!isEmbedded ? (
            <nav className="home-links">
              <Link href="/" className="home-link">
                Консоль
              </Link>
              <Link href="/calendar" className="home-link">
                Календарь
              </Link>
              <Link href="/notes" className="home-link">
                Заметки
              </Link>
              <Link href="/settings" className="home-link">
                Настройки
              </Link>
            </nav>
          ) : null}
        </header>

        <section className="home-card">
          <div className="home-card-head">
            <h2 className="home-card-title">Календарь</h2>
            <Link href="/calendar" className="home-card-link">
              Открыть
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <p className="home-muted">Событий пока нет.</p>
          ) : (
            <ul className="home-list">
              {upcomingEvents.map((event) => (
                <li key={event.id} className="home-list-item">
                  <span>{event.title}</span>
                  <span>
                    {event.date}
                    {event.time ? ` ${event.time}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="home-card">
          <div className="home-card-head">
            <h2 className="home-card-title">Заметки</h2>
            <Link href="/notes" className="home-card-link">
              Открыть
            </Link>
          </div>

          <p className="home-muted">Всего заметок: {notes.length}</p>
          {latestNote ? (
            <div className="home-inline-card">
              <p className="home-inline-title">{latestNote.title}</p>
              <p className="home-inline-body">{latestNote.body || "Без текста"}</p>
              <p className="home-inline-meta">{formatDate(latestNote.updatedAt)}</p>
            </div>
          ) : (
            <p className="home-muted">Добавьте первую заметку на странице /notes.</p>
          )}
        </section>

        <section className="home-card">
          <div className="home-card-head">
            <h2 className="home-card-title">Настройки</h2>
            <Link href="/settings" className="home-card-link">
              Открыть
            </Link>
          </div>

          <div className="home-settings-grid">
            <div className="home-inline-card">
              <p className="home-inline-title">Размер CLI</p>
              <p className="home-inline-body">
                {cliScale && Number.isFinite(cliScale)
                  ? `${Math.round(cliScale * 100)}%`
                  : "По умолчанию"}
              </p>
            </div>

            <div className="home-inline-card">
              <p className="home-inline-title">GitHub Billing</p>
              <p className="home-inline-body">
                {githubConnected ? `Подключено к org: ${githubOrg}` : "Не подключено"}
              </p>
              {githubLastSync ? <p className="home-inline-meta">Синхронизация: {githubLastSync}</p> : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
