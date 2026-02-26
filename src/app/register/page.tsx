"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useNetdenStore } from "@/lib/store";

export default function RegisterPage() {
  const buildSha = process.env.NEXT_PUBLIC_BUILD_SHA || "dev";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const router = useRouter();

  const register = useNetdenStore((state) => state.register);
  const bootstrapAuth = useNetdenStore((state) => state.bootstrapAuth);
  const isAuthenticated = useNetdenStore((state) => state.isAuthenticated);
  const isAuthLoading = useNetdenStore((state) => state.isAuthLoading);

  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    try {
      await register({ name, email, password });
      router.replace("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка регистрации";
      setFormError(message);
    }
  };

  return (
    <div className="home-page-shell">
      <div className="home-page-grid">
        <header className="home-header">
          <div className="home-header-left">
            <Link href="/" className="home-back-link">
              ← Терминал
            </Link>
            <div>
              <p className="home-kicker">NetDen</p>
              <h1 className="home-title">Регистрация</h1>
              <p className="home-subtitle">
                Резервная регистрация первого пользователя (если setup не создал его автоматически).
              </p>
            </div>
          </div>
          <nav className="home-links">
            <Link href="/login" className="home-link">
              Вход
            </Link>
          </nav>
        </header>

        <section className="home-card">
          <h2 className="home-card-title">Данные пользователя</h2>

          <form className="notes-form" onSubmit={handleSubmit}>
            {formError ? <p className="notes-error">{formError}</p> : null}

            <label className="settings-field">
              <span>Имя</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="notes-input"
                placeholder="Алекс"
                autoComplete="name"
                required
              />
            </label>

            <label className="settings-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="notes-input"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="settings-field">
              <span>Пароль</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="notes-input"
                placeholder="Минимум 8 символов"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            <button
              type="submit"
              disabled={isAuthLoading}
              className="notes-submit"
            >
              {isAuthLoading ? "Создаём..." : "Создать пользователя"}
            </button>
          </form>
        </section>

        <p className="home-muted">Build: {buildSha}</p>
      </div>
    </div>
  );
}
