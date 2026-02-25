"use client";

import { useMemo, useState } from "react";
import {
  SetupErrorResponse,
  SetupRecoverResponse,
  SetupRunInput,
  SetupRunResponse,
  SetupSummary,
  SslMode,
} from "@/lib/types";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-medium text-zinc-200">{label}</div>
        {hint ? <div className="text-xs text-zinc-500">{hint}</div> : null}
      </div>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-zinc-100",
        "placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-white/15",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-zinc-100",
        "outline-none focus:ring-2 focus:ring-white/15",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Button({
  kind = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "primary" | "ghost" }) {
  const classes =
    kind === "primary"
      ? "bg-white text-black hover:bg-zinc-200"
      : "bg-transparent text-zinc-200 hover:bg-white/5 border border-white/10";

  return (
    <button
      {...props}
      className={[
        "h-10 rounded-lg px-4 text-sm font-medium transition-colors",
        "disabled:opacity-50 disabled:pointer-events-none",
        classes,
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function StepPill({ active, children }: { active: boolean; children: string }) {
  return (
    <div
      className={[
        "rounded-full border px-3 py-1 text-xs",
        active ? "border-white/25 bg-white/10 text-zinc-100" : "border-white/10 text-zinc-500",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function readSetupError(data: unknown): SetupErrorResponse | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const candidate = data as Record<string, unknown>;
  if (typeof candidate.error !== "string") {
    return null;
  }

  return {
    error: candidate.error,
    needsRecovery: candidate.needsRecovery === true,
    recoveryEndpoint:
      typeof candidate.recoveryEndpoint === "string" ? candidate.recoveryEndpoint : undefined,
  };
}

function SummaryTable({ summary }: { summary: SetupSummary }) {
  const rows: Array<{ key: string; value: string }> = [
    { key: "DATABASE_URL", value: summary.databaseUrl },
    { key: "NETDEN_SESSION_SECRET", value: summary.sessionSecret },
    { key: "DB app role", value: summary.appRole },
    { key: "DB app password", value: summary.appPassword },
    ...(summary.initialUserEmail
      ? [{ key: "INITIAL_USER_EMAIL", value: summary.initialUserEmail }]
      : []),
  ];

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
      <div className="font-medium">Сводка (показывается один раз)</div>
      <div className="mt-3 grid gap-2">
        {rows.map((row) => (
          <div key={row.key} className="grid gap-1">
            <div className="text-xs uppercase tracking-wide text-amber-200/80">{row.key}</div>
            <code className="block rounded-md border border-amber-300/20 bg-black/25 px-2 py-2 text-xs break-all">
              {row.value}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SetupWizard() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pgHost, setPgHost] = useState("");
  const [pgPort, setPgPort] = useState(5432);
  const [pgUser, setPgUser] = useState("postgres");
  const [pgPassword, setPgPassword] = useState("");
  const [sslMode, setSslMode] = useState<SslMode>("require");

  const [dbName, setDbName] = useState("netden");
  const [appRole, setAppRole] = useState("netden_app");
  const [appPassword, setAppPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [done, setDone] = useState(false);
  const [needsRecovery, setNeedsRecovery] = useState(false);
  const [recoveryEndpoint, setRecoveryEndpoint] = useState("/api/setup/recover");
  const [summary, setSummary] = useState<SetupSummary | null>(null);

  const canProceed = useMemo(() => {
    if (busy || done) {
      return false;
    }

    if (step === 0) {
      return true;
    }

    if (step === 1) {
      return Boolean(pgHost.trim() && pgUser.trim() && pgPassword.trim() && pgPort > 0);
    }

    if (step === 2) {
      return Boolean(dbName.trim() && appRole.trim());
    }

    if (step === 3) {
      return Boolean(
        adminName.trim() &&
        adminEmail.trim().includes("@") &&
        adminPassword.trim().length >= 8,
      );
    }

    return step === 4;
  }, [
    adminEmail,
    adminName,
    adminPassword,
    appRole,
    busy,
    dbName,
    done,
    pgHost,
    pgPassword,
    pgPort,
    pgUser,
    step,
  ]);

  const payload: SetupRunInput = {
    pgAdmin: {
      host: pgHost.trim(),
      port: pgPort,
      user: pgUser.trim(),
      password: pgPassword,
      sslMode,
    },
    provision: {
      dbName: dbName.trim(),
      appRole: appRole.trim(),
      appPassword: appPassword.trim() || undefined,
    },
    siteAdmin: {
      name: adminName.trim(),
      email: adminEmail.trim(),
      password: adminPassword,
    },
  };

  async function runSetup() {
    setBusy(true);
    setError(null);
    setNeedsRecovery(false);

    try {
      const response = await fetch("/api/setup/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const setupError = readSetupError(data);
        if (response.status === 409 && setupError?.needsRecovery) {
          setNeedsRecovery(true);
          if (setupError.recoveryEndpoint) {
            setRecoveryEndpoint(setupError.recoveryEndpoint);
          }
        }
        throw new Error(setupError?.error || `Ошибка setup (HTTP ${response.status})`);
      }

      const success = data as SetupRunResponse;
      setSummary(success.generated);
      setDone(true);
      setStep(4);
    } catch (runError: unknown) {
      setError(runError instanceof Error ? runError.message : "Ошибка setup");
    } finally {
      setBusy(false);
    }
  }

  async function runRecovery() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(recoveryEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const setupError = readSetupError(data);
        throw new Error(setupError?.error || `Ошибка recovery (HTTP ${response.status})`);
      }

      const recovered = data as SetupRecoverResponse;
      setSummary(recovered.recovered);
      setDone(true);
      setStep(4);
    } catch (recoverError: unknown) {
      setError(recoverError instanceof Error ? recoverError.message : "Ошибка recovery");
    } finally {
      setBusy(false);
    }
  }

  function nextStep() {
    if (step === 4) {
      void runSetup();
      return;
    }

    setStep((current) => Math.min(5, current + 1));
  }

  function previousStep() {
    setError(null);
    setStep((current) => Math.max(0, current - 1));
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(60%_80%_at_50%_0%,rgba(255,255,255,0.10),rgba(0,0,0,0)),linear-gradient(to_bottom,#09090b,#000)] px-5 py-10 text-zinc-100 font-sans">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-6">
          <div className="text-xs font-medium tracking-wide text-zinc-500">NetDen</div>
          <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight">Первичная настройка</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Мастер создаст базу приложения, DB-роль, первого пользователя и подготовит переменные
            для Timeweb App Platform.
          </p>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <StepPill active={step === 0}>Введение</StepPill>
          <StepPill active={step === 1}>PostgreSQL</StepPill>
          <StepPill active={step === 2}>Провижининг</StepPill>
          <StepPill active={step === 3}>Первый пользователь</StepPill>
          <StepPill active={step === 4}>Запуск</StepPill>
          <StepPill active={step === 5}>Сводка</StepPill>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]">
          {step === 0 ? (
            <div className="grid gap-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-medium">Что будет сделано</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-400">
                  <li>Создание/обновление DB-роли приложения.</li>
                  <li>Создание базы данных и применение миграций Prisma.</li>
                  <li>Создание первого пользователя с начальными событиями.</li>
                  <li>Генерация NETDEN_SESSION_SECRET.</li>
                  <li>Вывод сводки для вставки в Timeweb Variables.</li>
                </ul>
              </div>
              <div className="text-sm text-zinc-400">
                После завершения setup обязательно обновите Variables и выполните redeploy.
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="IP / host PostgreSQL" hint="например 127.0.0.1">
                  <Input value={pgHost} onChange={(e) => setPgHost(e.target.value)} autoFocus />
                </Field>
                <Field label="Порт">
                  <Input
                    value={pgPort}
                    onChange={(e) => setPgPort(Number(e.target.value || 0))}
                    type="number"
                    min={1}
                    inputMode="numeric"
                  />
                </Field>
              </div>
              <Field label="Логин администратора PostgreSQL">
                <Input value={pgUser} onChange={(e) => setPgUser(e.target.value)} />
              </Field>
              <Field label="Пароль администратора PostgreSQL">
                <Input
                  value={pgPassword}
                  onChange={(e) => setPgPassword(e.target.value)}
                  type="password"
                />
              </Field>
              <Field label="SSL mode">
                <Select value={sslMode} onChange={(e) => setSslMode(e.target.value as SslMode)}>
                  <option value="require">require</option>
                  <option value="disable">disable</option>
                </Select>
              </Field>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4">
              <Field label="Имя базы приложения" hint="буквы, цифры, _">
                <Input value={dbName} onChange={(e) => setDbName(e.target.value)} autoFocus />
              </Field>
              <Field label="Имя DB-роли приложения" hint="буквы, цифры, _">
                <Input value={appRole} onChange={(e) => setAppRole(e.target.value)} />
              </Field>
              <Field label="Пароль DB-роли (опционально)" hint="пусто = авто-генерация">
                <Input
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  type="password"
                />
              </Field>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4">
              <Field label="Имя первого пользователя">
                <Input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Алекс"
                  autoComplete="name"
                  autoFocus
                />
              </Field>
              <Field label="Email первого пользователя">
                <Input
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                />
              </Field>
              <Field label="Пароль первого пользователя" hint="минимум 8 символов">
                <Input
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                />
              </Field>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                Нажмите «Запустить setup». Мастер применит миграции, создаст первого пользователя и
                сгенерирует итоговые секреты.
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="grid gap-4">
              {done && summary ? <SummaryTable summary={summary} /> : null}

              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                <div className="font-medium text-zinc-100">Обязательные шаги после setup</div>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Откройте Timeweb Apps → Variables.</li>
                  <li>Вставьте значения из сводки: DATABASE_URL и NETDEN_SESSION_SECRET.</li>
                  <li>Сделайте redeploy приложения.</li>
                  <li>После redeploy авторизуйтесь через /login данными первого пользователя.</li>
                </ol>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  className="inline-flex h-10 items-center rounded-lg border border-white/10 bg-transparent px-4 text-sm font-medium text-zinc-200 hover:bg-white/5"
                  href="/login"
                >
                  Открыть /login
                </a>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              <div>{error}</div>
              {needsRecovery ? (
                <div className="mt-3 rounded-lg border border-white/15 bg-black/20 p-3 text-red-50">
                  <div className="text-sm font-medium">Доступно восстановление</div>
                  <p className="mt-1 text-xs text-red-100/90">
                    Найдены существующие пользователи в БД. Можно восстановить setup-состояние без
                    удаления данных.
                  </p>
                  <div className="mt-3">
                    <Button
                      type="button"
                      onClick={() => {
                        void runRecovery();
                      }}
                      disabled={busy}
                      className="h-9"
                    >
                      {busy ? "Восстанавливаем..." : "Восстановить из БД"}
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-red-100/80">Endpoint: {recoveryEndpoint}</div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-3">
            <Button kind="ghost" onClick={previousStep} disabled={busy || done || step === 0}>
              Назад
            </Button>
            <Button onClick={nextStep} disabled={!canProceed}>
              {step === 0
                ? "Начать"
                : step === 4
                  ? busy
                    ? "Запуск..."
                    : "Запустить setup"
                  : "Далее"}
            </Button>
          </div>
        </div>

        <div className="mt-6 text-xs text-zinc-600">
          В этом режиме значения не сохраняются на диске контейнера: финальная сводка предназначена
          для ручного переноса в Timeweb Variables.
        </div>
      </div>
    </div>
  );
}
