"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useNetdenStore } from "@/lib/store";
import styles from "./login.module.css";

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
      router.replace("/");
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
      router.replace("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка входа";
      setFormError(message);
    }
  };

  return (
    <div className={styles['login-page']}>
      {/* Background mesh */}
      <div className={styles['login-bg-mesh']} aria-hidden />

      <div className={styles['login-center']}>
        {/* Brand */}
        <div className={`${styles['login-brand']} ${fieldsReady ? styles['login-brand-visible'] : ''}`}>
          <span className={styles['login-brand-mark']}>◈</span>
          <span className={styles['login-brand-name']}>NetDen</span>
        </div>

        {/* Card */}
        <div className={`${styles['login-card']} ${fieldsReady ? styles['login-card-visible'] : ''}`}>
          <div className={styles['login-card-inner']}>
            <h1 className={styles['login-heading']}>Вход</h1>
            <p className={styles['login-subheading']}>
              Войдите, чтобы продолжить работу с календарём, задачами и заметками.
            </p>

            <form className={styles['login-form']} onSubmit={handleSubmit}>
              {formError && <div className={styles['login-error']}>{formError}</div>}

              <label
                className={`${styles['login-field']} ${fieldsReady ? styles['login-field-visible'] : ''}`}
                style={{ transitionDelay: fieldsReady ? "160ms" : "0ms" }}
              >
                <span className={styles['login-label']}>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles['login-input']}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </label>

              <label
                className={`${styles['login-field']} ${fieldsReady ? styles['login-field-visible'] : ''}`}
                style={{ transitionDelay: fieldsReady ? "240ms" : "0ms" }}
              >
                <span className={styles['login-label']}>Пароль</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles['login-input']}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={isAuthLoading}
                className={`${styles['login-submit']} ${fieldsReady ? styles['login-submit-visible'] : ''}`}
              >
                {isAuthLoading ? "Подключение…" : "Войти →"}
              </button>
            </form>

            <div className={styles['login-footer']}>
              <span className={styles['login-footer-text']}>Нет аккаунта?</span>
              <Link href="/register" className={styles['login-footer-link']}>
                Регистрация
              </Link>
            </div>
          </div>
        </div>

        {/* Hint */}
        <div className={`${styles['login-hint']} ${fieldsReady ? styles['login-hint-visible'] : ''}`}>
          <span className={styles['login-hint-key']}>↵</span>
          <span>Войти</span>
        </div>
      </div>
    </div>
  );
}
