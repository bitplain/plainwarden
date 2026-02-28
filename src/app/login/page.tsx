"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useNetdenStore } from "@/lib/store";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldsReady, setFieldsReady] = useState(false);

  const router = useRouter();
  const login = useNetdenStore((s) => s.login);
  const bootstrapAuth = useNetdenStore((s) => s.bootstrapAuth);
  const isAuthenticated = useNetdenStore((s) => s.isAuthenticated);
  const isAuthLoading = useNetdenStore((s) => s.isAuthLoading);

  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/calendar");
    }
  }, [isAuthenticated, router]);

  /* Staggered field reveal */
  useEffect(() => {
    const t = setTimeout(() => setFieldsReady(true), 120);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    try {
      await login({ email, password });
      router.replace("/calendar");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка входа";
      setFormError(message);
    }
  };

  return (
    <div className="login-page">
      {/* Background mesh */}
      <div className="login-bg-mesh" aria-hidden />

      <div className="login-center">
        {/* Brand */}
        <div className={`login-brand ${fieldsReady ? "login-brand-visible" : ""}`}>
          <span className="login-brand-mark">◈</span>
          <span className="login-brand-name">NetDen</span>
        </div>

        {/* Card */}
        <div className={`login-card ${fieldsReady ? "login-card-visible" : ""}`}>
          <div className="login-card-inner">
            <h1 className="login-heading">Вход</h1>
            <p className="login-subheading">
              Войдите, чтобы продолжить работу с календарём, задачами и заметками.
            </p>

            <form className="login-form" onSubmit={handleSubmit}>
              {formError && <div className="login-error">{formError}</div>}

              <label
                className={`login-field ${fieldsReady ? "login-field-visible" : ""}`}
                style={{ transitionDelay: fieldsReady ? "160ms" : "0ms" }}
              >
                <span className="login-label">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </label>

              <label
                className={`login-field ${fieldsReady ? "login-field-visible" : ""}`}
                style={{ transitionDelay: fieldsReady ? "240ms" : "0ms" }}
              >
                <span className="login-label">Пароль</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={isAuthLoading}
                className={`login-submit ${fieldsReady ? "login-submit-visible" : ""}`}
              >
                {isAuthLoading ? "Подключение…" : "Войти →"}
              </button>
            </form>

            <div className="login-footer">
              <span className="login-footer-text">Нет аккаунта?</span>
              <Link href="/register" className="login-footer-link">
                Регистрация
              </Link>
            </div>
          </div>
        </div>

        {/* Hint */}
        <div className={`login-hint ${fieldsReady ? "login-hint-visible" : ""}`}>
          <span className="login-hint-key">↵</span>
          <span>Войти</span>
        </div>
      </div>
    </div>
  );
}
