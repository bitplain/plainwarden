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
    <div className="min-h-dvh bg-[radial-gradient(60%_80%_at_50%_0%,rgba(255,255,255,0.10),rgba(0,0,0,0)),linear-gradient(to_bottom,#09090b,#000)] px-5 py-10 text-zinc-100 font-sans">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6">
          <div className="text-xs font-medium tracking-wide text-zinc-500">NetDen</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Первая регистрация</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Резервная регистрация первого пользователя (если setup не создал его автоматически).
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]"
        >
          <div className="grid gap-3">
            {formError ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">
                {formError}
              </div>
            ) : null}

            <label className="grid gap-1.5">
              <div className="text-sm font-medium text-zinc-200">Имя</div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-white/15"
                placeholder="Алекс"
                autoComplete="name"
                required
              />
            </label>

            <label className="grid gap-1.5">
              <div className="text-sm font-medium text-zinc-200">Email</div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-white/15"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="grid gap-1.5">
              <div className="text-sm font-medium text-zinc-200">Пароль</div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-white/15"
                placeholder="Минимум 8 символов"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            <button
              type="submit"
              disabled={isAuthLoading}
              className="h-10 w-full rounded-lg bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isAuthLoading ? "Создаём..." : "Создать пользователя"}
            </button>
          </div>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
          <Link href="/login" className="text-[var(--nd-accent)] hover:underline">
            Уже есть аккаунт
          </Link>
          <Link href="/" className="hover:text-zinc-200 transition-colors">
            ← Назад в терминал
          </Link>
        </div>

        <p className="mt-3 text-[10px] text-zinc-500">Build: {buildSha}</p>
      </div>
    </div>
  );
}
