"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  SetupConnectionMode,
  SetupEmergencyAccountOption,
  SetupEmergencyResetResponse,
  SetupEmergencyStateResponse,
  SetupErrorResponse,
  SetupPresetResponse,
  SetupRecoverResponse,
  SetupRunInput,
  SetupRunResponse,
  SetupSummary,
  SslMode,
} from "@/lib/types";
import homeStyles from "@/styles/home.module.css";
import settingsStyles from "@/styles/settings.module.css";

const RUN_STEP = 5;
const SUMMARY_STEP = 6;
const PRESET_TIMEOUT_MS = 4_000;

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
    <label className={settingsStyles["settings-field"]}>
      <span>
        {label}
        {hint ? <span className={settingsStyles["settings-hint"]}>{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={homeStyles["notes-input"]} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={homeStyles["notes-input"]} />;
}

function Button({
  kind = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "primary" | "ghost" }) {
  const cls =
    kind === "primary"
      ? homeStyles["notes-submit"]
      : `${homeStyles["notes-submit"]} ${settingsStyles["settings-reset"]}`;

  return <button {...props} className={cls} />;
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

function isConnectionMode(value: unknown): value is SetupConnectionMode {
  return value === "docker" || value === "remote";
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
    canUseEmergencyRecovery: candidate.canUseEmergencyRecovery === true,
  };
}

function readSetupPreset(data: unknown): SetupPresetResponse | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const candidate = data as Record<string, unknown>;
  if (!isConnectionMode(candidate.mode)) {
    return null;
  }
  if (!candidate.pgAdmin || typeof candidate.pgAdmin !== "object") {
    return null;
  }
  if (!candidate.provision || typeof candidate.provision !== "object") {
    return null;
  }

  const pgAdmin = candidate.pgAdmin as Record<string, unknown>;
  const provision = candidate.provision as Record<string, unknown>;
  if (
    typeof pgAdmin.host !== "string" ||
    typeof pgAdmin.port !== "number" ||
    typeof pgAdmin.user !== "string" ||
    typeof pgAdmin.password !== "string"
  ) {
    return null;
  }
  if (pgAdmin.sslMode !== "disable" && pgAdmin.sslMode !== "require") {
    return null;
  }
  if (typeof provision.dbName !== "string" || typeof provision.appRole !== "string") {
    return null;
  }
  if (provision.appPassword !== undefined && typeof provision.appPassword !== "string") {
    return null;
  }

  return {
    mode: candidate.mode,
    pgAdmin: {
      host: pgAdmin.host,
      port: pgAdmin.port,
      user: pgAdmin.user,
      password: pgAdmin.password,
      sslMode: pgAdmin.sslMode,
    },
    provision: {
      dbName: provision.dbName,
      appRole: provision.appRole,
      appPassword: provision.appPassword,
    },
  };
}

function readEmergencyState(data: unknown): SetupEmergencyStateResponse | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const candidate = data as Record<string, unknown>;
  if (candidate.ok !== true || !Array.isArray(candidate.accounts)) {
    return null;
  }
  if (typeof candidate.legacyRecoveryEndpoint !== "string" || typeof candidate.warning !== "string") {
    return null;
  }

  const accounts: SetupEmergencyAccountOption[] = [];
  for (const raw of candidate.accounts) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    const record = raw as Record<string, unknown>;
    if (typeof record.userId !== "string" || typeof record.maskedEmail !== "string") {
      return null;
    }
    accounts.push({
      userId: record.userId,
      maskedEmail: record.maskedEmail,
    });
  }

  return {
    ok: true,
    accounts,
    legacyRecoveryEndpoint: candidate.legacyRecoveryEndpoint,
    warning: candidate.warning,
  };
}

function readEmergencyReset(data: unknown): SetupEmergencyResetResponse | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const candidate = data as Record<string, unknown>;
  if (candidate.ok !== true || typeof candidate.loginEmail !== "string") {
    return null;
  }
  return {
    ok: true,
    loginEmail: candidate.loginEmail,
  };
}

function getManualPreset(mode: SetupConnectionMode): SetupPresetResponse {
  if (mode === "remote") {
    return {
      mode,
      pgAdmin: {
        host: "",
        port: 5432,
        user: "",
        password: "",
        sslMode: "require",
      },
      provision: {
        dbName: "",
        appRole: "",
        appPassword: undefined,
      },
    };
  }

  return {
    mode: "docker",
    pgAdmin: {
      host: "postgres",
      port: 5432,
      user: "netden",
      password: "netdenpass",
      sslMode: "disable",
    },
    provision: {
      dbName: "netden",
      appRole: "netden_app",
      appPassword: undefined,
    },
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
  const [presetLoading, setPresetLoading] = useState(false);
  const [presetWarning, setPresetWarning] = useState<string | null>(null);
  const [presetReloadToken, setPresetReloadToken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [alreadyInitialized, setAlreadyInitialized] = useState(false);
  const [recoveryOnly, setRecoveryOnly] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState<"emergency" | "legacy">("emergency");
  const [connectionMode, setConnectionMode] = useState<SetupConnectionMode>("docker");

  const [pgHost, setPgHost] = useState("");
  const [pgPort, setPgPort] = useState(5432);
  const [pgUser, setPgUser] = useState("");
  const [pgPassword, setPgPassword] = useState("");
  const [sslMode, setSslMode] = useState<SslMode>("require");

  const [dbName, setDbName] = useState("");
  const [appRole, setAppRole] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");

  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState("");

  const [emergencyAccounts, setEmergencyAccounts] = useState<SetupEmergencyAccountOption[]>([]);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);
  const [emergencyWarning, setEmergencyWarning] = useState<string | null>(null);
  const [selectedEmergencyUserId, setSelectedEmergencyUserId] = useState("");
  const [emergencyNewPassword, setEmergencyNewPassword] = useState("");
  const [emergencyNewPasswordConfirm, setEmergencyNewPasswordConfirm] = useState("");
  const [emergencyRecoveredEmail, setEmergencyRecoveredEmail] = useState<string | null>(null);
  const [legacyRecoveryEndpoint, setLegacyRecoveryEndpoint] = useState("/api/setup/recover");

  const [done, setDone] = useState(false);
  const [needsRecovery, setNeedsRecovery] = useState(false);
  const [recoveryEndpoint, setRecoveryEndpoint] = useState("/api/setup/recover");
  const [summary, setSummary] = useState<SetupSummary | null>(null);

  const isRecoveryFlow = recoveryOnly || needsRecovery;

  function applyPreset(preset: SetupPresetResponse) {
    setPgHost(preset.pgAdmin.host);
    setPgPort(preset.pgAdmin.port);
    setPgUser(preset.pgAdmin.user);
    setPgPassword(preset.pgAdmin.password);
    setSslMode(preset.pgAdmin.sslMode);
    setDbName(preset.provision.dbName);
    setAppRole(preset.provision.appRole);
    setAppPassword(preset.provision.appPassword ?? "");
  }

  useEffect(() => {
    fetch("/api/setup/state")
      .then(
        (r) =>
          r.json() as Promise<{ initialized?: boolean; databaseConfigured?: boolean }>,
      )
      .then((data) => {
        if (data.initialized) {
          setAlreadyInitialized(true);
        }

        if (data.initialized && data.databaseConfigured) {
          setRecoveryOnly(true);
          setNeedsRecovery(true);
          setStep(RUN_STEP);
        }
      })
      .catch((stateError) => {
        console.warn("Could not determine setup state:", stateError);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const abort = new AbortController();
    const timeoutId = setTimeout(() => abort.abort(), PRESET_TIMEOUT_MS);
    setPresetLoading(true);
    setPresetWarning(null);

    fetch(`/api/setup/preset?mode=${connectionMode}`, { signal: abort.signal })
      .then(async (response) => {
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const setupError = readSetupError(data);
          throw new Error(setupError?.error || `Ошибка пресета (HTTP ${response.status})`);
        }
        const parsed = readSetupPreset(data);
        if (!parsed) {
          throw new Error("Некорректный ответ /api/setup/preset");
        }
        return parsed;
      })
      .then((preset) => {
        if (cancelled) {
          return;
        }
        applyPreset(preset);
      })
      .catch((presetError: unknown) => {
        if (cancelled) {
          return;
        }
        applyPreset(getManualPreset(connectionMode));
        const message =
          presetError instanceof Error
            ? presetError.message
            : "Не удалось загрузить автоподстановку";
        setPresetWarning(
          `Автоподстановка недоступна, включён ручной режим (${message})`,
        );
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (!cancelled) {
          setPresetLoading(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      abort.abort();
    };
  }, [connectionMode, presetReloadToken]);

  useEffect(() => {
    if (!isRecoveryFlow) {
      return;
    }

    let cancelled = false;
    setEmergencyLoading(true);
    setEmergencyError(null);

    fetch("/api/setup/emergency/state")
      .then(async (response) => {
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const setupError = readSetupError(data);
          throw new Error(setupError?.error || `Ошибка emergency state (HTTP ${response.status})`);
        }

        const parsed = readEmergencyState(data);
        if (!parsed) {
          throw new Error("Некорректный ответ /api/setup/emergency/state");
        }
        return parsed;
      })
      .then((state) => {
        if (cancelled) {
          return;
        }
        setEmergencyAccounts(state.accounts);
        setSelectedEmergencyUserId((current) =>
          current || state.accounts[0]?.userId || "",
        );
        setEmergencyWarning(state.warning);
        setLegacyRecoveryEndpoint(state.legacyRecoveryEndpoint);
      })
      .catch((loadError: unknown) => {
        if (cancelled) {
          return;
        }
        setEmergencyAccounts([]);
        setSelectedEmergencyUserId("");
        setEmergencyError(
          loadError instanceof Error ? loadError.message : "Ошибка загрузки аварийного recovery",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setEmergencyLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isRecoveryFlow]);

  const canProceed = useMemo(() => {
    if (busy || done) {
      return false;
    }

    if (step === 0 || step === 1) {
      return true;
    }

    if (step === 2) {
      return Boolean(pgHost.trim() && pgUser.trim() && pgPassword.trim() && pgPort > 0);
    }

    if (step === 3) {
      return Boolean(dbName.trim() && appRole.trim());
    }

    if (step === 4) {
      if (isRecoveryFlow) {
        return true;
      }
      return Boolean(
        adminName.trim() &&
          adminEmail.trim().includes("@") &&
          adminPassword.trim().length >= 12 &&
          adminPassword === adminPasswordConfirm,
      );
    }

    if (step === RUN_STEP) {
      if (!isRecoveryFlow) {
        return true;
      }
      if (recoveryMode === "legacy") {
        return true;
      }
      return Boolean(
        !emergencyLoading &&
          selectedEmergencyUserId &&
          emergencyNewPassword.trim().length >= 12 &&
          emergencyNewPassword === emergencyNewPasswordConfirm,
      );
    }

    return false;
  }, [
    adminEmail,
    adminName,
    adminPassword,
    adminPasswordConfirm,
    appRole,
    busy,
    dbName,
    done,
    emergencyLoading,
    emergencyNewPassword,
    emergencyNewPasswordConfirm,
    isRecoveryFlow,
    pgHost,
    pgPassword,
    pgPort,
    pgUser,
    recoveryMode,
    selectedEmergencyUserId,
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
          setRecoveryOnly(true);
          setRecoveryMode("emergency");
          if (setupError.recoveryEndpoint) {
            setRecoveryEndpoint(setupError.recoveryEndpoint);
          }
          setStep(RUN_STEP);
        }
        throw new Error(setupError?.error || `Ошибка setup (HTTP ${response.status})`);
      }

      const success = data as SetupRunResponse;
      setSummary(success.generated);
      setDone(true);
      setStep(SUMMARY_STEP);
    } catch (runError: unknown) {
      setError(runError instanceof Error ? runError.message : "Ошибка setup");
    } finally {
      setBusy(false);
    }
  }

  async function runLegacyRecovery() {
    setBusy(true);
    setError(null);

    try {
      const wantsPasswordReset = Boolean(
        recoveryEmail.trim() || recoveryPassword.trim() || recoveryPasswordConfirm.trim(),
      );
      if (wantsPasswordReset) {
        if (!recoveryEmail.trim().includes("@")) {
          throw new Error("Укажите корректный email для восстановления доступа");
        }
        if (recoveryPassword.trim().length < 12) {
          throw new Error("Новый пароль должен быть не короче 12 символов");
        }
        if (recoveryPassword !== recoveryPasswordConfirm) {
          throw new Error("Пароли восстановления не совпадают");
        }
      }

      const recoveryPayload = wantsPasswordReset
        ? {
            ...payload,
            accountRecovery: {
              email: recoveryEmail.trim(),
              password: recoveryPassword,
            },
          }
        : payload;

      const response = await fetch(recoveryEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(recoveryPayload),
      });

      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const setupError = readSetupError(data);
        throw new Error(setupError?.error || `Ошибка recovery (HTTP ${response.status})`);
      }

      const recovered = data as SetupRecoverResponse;
      setSummary(recovered.recovered);
      setDone(true);
      setStep(SUMMARY_STEP);
    } catch (recoverError: unknown) {
      setError(recoverError instanceof Error ? recoverError.message : "Ошибка recovery");
    } finally {
      setBusy(false);
    }
  }

  async function runEmergencyRecovery() {
    setBusy(true);
    setError(null);

    try {
      if (!selectedEmergencyUserId) {
        throw new Error("Выберите аккаунт для восстановления");
      }
      if (emergencyNewPassword.trim().length < 12) {
        throw new Error("Новый пароль должен быть не короче 12 символов");
      }
      if (emergencyNewPassword !== emergencyNewPasswordConfirm) {
        throw new Error("Пароли не совпадают");
      }

      const response = await fetch("/api/setup/emergency/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: selectedEmergencyUserId,
          newPassword: emergencyNewPassword,
        }),
      });

      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const setupError = readSetupError(data);
        throw new Error(setupError?.error || `Ошибка emergency reset (HTTP ${response.status})`);
      }

      const success = readEmergencyReset(data);
      if (!success) {
        throw new Error("Некорректный ответ /api/setup/emergency/reset");
      }

      setEmergencyRecoveredEmail(success.loginEmail);
      setDone(true);
      setSummary(null);
      setStep(SUMMARY_STEP);
    } catch (recoverError: unknown) {
      setError(recoverError instanceof Error ? recoverError.message : "Ошибка emergency recovery");
    } finally {
      setBusy(false);
    }
  }

  function nextStep() {
    if (step === RUN_STEP) {
      if (isRecoveryFlow) {
        if (recoveryMode === "legacy") {
          void runLegacyRecovery();
        } else {
          void runEmergencyRecovery();
        }
      } else {
        void runSetup();
      }
      return;
    }

    setError(null);
    setStep((current) => {
      if (isRecoveryFlow && current === 3) {
        return RUN_STEP;
      }
      return Math.min(SUMMARY_STEP, current + 1);
    });
  }

  function previousStep() {
    setError(null);
    setStep((current) => {
      if (isRecoveryFlow && current === RUN_STEP) {
        return 3;
      }
      return Math.max(0, current - 1);
    });
  }

  function actionLabel(): string {
    if (step === RUN_STEP) {
      if (isRecoveryFlow) {
        if (recoveryMode === "legacy") {
          return busy ? "Восстанавливаем..." : "Восстановить через DB-учётку";
        }
        return busy ? "Сбрасываем..." : "Сбросить пароль и перейти к логину";
      }
      return busy ? "Запуск..." : "Запустить setup";
    }
    return "Далее";
  }

  return (
    <div className={homeStyles["home-page-shell"]}>
      <div className={homeStyles["home-page-grid"]}>
        <header className={homeStyles["home-header"]}>
          <div className={homeStyles["home-header-left"]}>
            <Link href="/" className={homeStyles["home-back-link"]}>
              ← Терминал
            </Link>
            <div>
              <p className={homeStyles["home-kicker"]}>NetDen</p>
              <h1 className={homeStyles["home-title"]}>Первичная настройка</h1>
              <p className={homeStyles["home-subtitle"]}>
                Мастер создаст базу приложения, DB-роль, первого пользователя и подготовит переменные
                для Timeweb App Platform.
              </p>
            </div>
          </div>
        </header>

        <div className={homeStyles["home-card"]}>
          <div className={homeStyles["home-card-head"]}>
            <h2 className={homeStyles["home-card-title"]}>Шаги</h2>
          </div>
          <div className={homeStyles["home-links"]}>
            <StepPill active={step === 0}>Источник БД</StepPill>
            <StepPill active={step === 1}>Введение</StepPill>
            <StepPill active={step === 2}>PostgreSQL</StepPill>
            <StepPill active={step === 3}>Провижининг</StepPill>
            {!isRecoveryFlow ? <StepPill active={step === 4}>Первый пользователь</StepPill> : null}
            <StepPill active={step === RUN_STEP}>{isRecoveryFlow ? "Recovery" : "Запуск"}</StepPill>
            <StepPill active={step === SUMMARY_STEP}>Сводка</StepPill>
          </div>
        </div>

        <section className={homeStyles["home-card"]}>
          {step === 0 ? (
            <div className={settingsStyles["settings-grid"]}>
              <div className={settingsStyles["acme-note"]}>
                <p className={homeStyles["home-inline-title"]}>Источник подключения к PostgreSQL</p>
                <p className={homeStyles["home-muted"]}>
                  Для Docker параметры подставляются автоматически. При сбое автоподстановки мастер
                  перейдёт в ручной режим без блокировки.
                </p>
              </div>
              <div className={homeStyles["home-links"]}>
                <Button
                  type="button"
                  kind={connectionMode === "docker" ? "primary" : "ghost"}
                  disabled={busy || presetLoading}
                  onClick={() => setConnectionMode("docker")}
                >
                  Docker local
                </Button>
                <Button
                  type="button"
                  kind={connectionMode === "remote" ? "primary" : "ghost"}
                  disabled={busy || presetLoading}
                  onClick={() => setConnectionMode("remote")}
                >
                  Remote IP
                </Button>
                <Button
                  type="button"
                  kind="ghost"
                  disabled={busy || presetLoading}
                  onClick={() => setPresetReloadToken((current) => current + 1)}
                >
                  {presetLoading ? "Пробуем..." : "Повторить автоподстановку"}
                </Button>
              </div>
              <p className={homeStyles["home-muted"]}>
                Текущий режим: <strong>{connectionMode === "docker" ? "Docker local" : "Remote IP"}</strong>
              </p>
              {presetLoading ? (
                <p className={homeStyles["home-muted"]}>Загружаем пресет…</p>
              ) : null}
              {presetWarning ? <p className={homeStyles["notes-error"]}>{presetWarning}</p> : null}
            </div>
          ) : null}

          {step === 1 ? (
            <div className={settingsStyles["settings-grid"]}>
              {alreadyInitialized ? (
                <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <p className={homeStyles["home-inline-title"]}>⚠ Настройка уже выполнялась</p>
                  <p className={homeStyles["home-muted"]}>
                    Обнаружена ранее настроенная система. Доступен recovery-режим для восстановления
                    доступа без удаления данных.
                  </p>
                </div>
              ) : null}
              {isRecoveryFlow ? (
                <div className={settingsStyles["acme-note"]}>
                  <p className={homeStyles["home-inline-title"]}>Включен recovery-режим</p>
                  <p className={homeStyles["home-muted"]}>
                    Обычный setup недоступен при настроенном `DATABASE_URL`. Используйте аварийный
                    recovery или расширенный режим с DB-учёткой.
                  </p>
                </div>
              ) : (
                <div className={settingsStyles["acme-note"]}>
                  <p className={homeStyles["home-inline-title"]}>Что будет сделано</p>
                  <ul className={`${settingsStyles["setup-list"]} ${settingsStyles["setup-list-disc"]}`}>
                    <li>Создание/обновление DB-роли приложения.</li>
                    <li>Создание базы данных и применение миграций Prisma.</li>
                    <li>Создание первого пользователя с начальными событиями.</li>
                    <li>Генерация NETDEN_SESSION_SECRET.</li>
                    <li>Вывод сводки для вставки в Variables.</li>
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          {step === 2 ? (
            <div className={settingsStyles["settings-grid"]}>
              <p className={homeStyles["home-muted"]}>
                Режим: <strong>{connectionMode === "docker" ? "Docker local" : "Remote IP"}</strong>
              </p>
              <div className={settingsStyles["settings-inline"]}>
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
              {sslMode === "require" ? (
                <p className={settingsStyles["setup-ssl-warning"]}>
                  ⚠ Режим <strong>require</strong> шифрует соединение, но не проверяет
                  сертификат сервера — возможна MITM-атака.
                </p>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className={settingsStyles["settings-grid"]}>
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

          {step === 4 && !isRecoveryFlow ? (
            <div className={settingsStyles["settings-grid"]}>
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
              <Field label="Пароль первого пользователя" hint="минимум 12 символов">
                <Input
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                />
              </Field>
              <Field label="Повторите пароль">
                <Input
                  value={adminPasswordConfirm}
                  onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                />
              </Field>
            </div>
          ) : null}

          {step === RUN_STEP ? (
            <div className={settingsStyles["settings-grid"]}>
              {isRecoveryFlow ? (
                <>
                  <div className={settingsStyles["acme-note"]}>
                    <p className={homeStyles["home-inline-title"]}>Выберите режим восстановления</p>
                    <p className={homeStyles["home-muted"]}>
                      Аварийный режим не требует DB-учётки, но должен использоваться только в
                      доверенной self-hosted среде.
                    </p>
                  </div>
                  <div className={homeStyles["home-links"]}>
                    <Button
                      type="button"
                      kind={recoveryMode === "emergency" ? "primary" : "ghost"}
                      disabled={busy}
                      onClick={() => setRecoveryMode("emergency")}
                    >
                      Аварийное восстановление
                    </Button>
                    <Button
                      type="button"
                      kind={recoveryMode === "legacy" ? "primary" : "ghost"}
                      disabled={busy}
                      onClick={() => setRecoveryMode("legacy")}
                    >
                      Расширенный режим (DB)
                    </Button>
                  </div>

                  {recoveryMode === "emergency" ? (
                    <div className={settingsStyles["settings-grid"]}>
                      {emergencyWarning ? (
                        <p className={homeStyles["home-muted"]}>{emergencyWarning}</p>
                      ) : null}
                      {emergencyLoading ? (
                        <p className={homeStyles["home-muted"]}>Загружаем доступные аккаунты…</p>
                      ) : null}
                      {emergencyError ? (
                        <p className={homeStyles["notes-error"]}>{emergencyError}</p>
                      ) : null}
                      {!emergencyLoading && !emergencyError && emergencyAccounts.length === 0 ? (
                        <p className={homeStyles["home-muted"]}>
                          Нет доступных аккаунтов для аварийного восстановления.
                        </p>
                      ) : null}
                      {!emergencyLoading && emergencyAccounts.length > 0 ? (
                        <>
                          <Field label="Аккаунт для восстановления">
                            <Select
                              value={selectedEmergencyUserId}
                              onChange={(e) => setSelectedEmergencyUserId(e.target.value)}
                            >
                              {emergencyAccounts.map((account) => (
                                <option key={account.userId} value={account.userId}>
                                  {account.maskedEmail}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label="Новый пароль" hint="минимум 12 символов">
                            <Input
                              value={emergencyNewPassword}
                              onChange={(e) => setEmergencyNewPassword(e.target.value)}
                              type="password"
                              autoComplete="new-password"
                              minLength={12}
                            />
                          </Field>
                          <Field label="Повторите новый пароль">
                            <Input
                              value={emergencyNewPasswordConfirm}
                              onChange={(e) => setEmergencyNewPasswordConfirm(e.target.value)}
                              type="password"
                              autoComplete="new-password"
                              minLength={12}
                            />
                          </Field>
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <div className={settingsStyles["settings-grid"]}>
                      <p className={settingsStyles["acme-note"]}>
                        В этом режиме используются DB-учётки для восстановления через endpoint
                        `{legacyRecoveryEndpoint}`.
                      </p>
                      <Field label="Email пользователя для сброса пароля (опционально)">
                        <Input
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                        />
                      </Field>
                      <Field label="Новый пароль (опционально)" hint="минимум 12 символов">
                        <Input
                          value={recoveryPassword}
                          onChange={(e) => setRecoveryPassword(e.target.value)}
                          type="password"
                          autoComplete="new-password"
                          minLength={12}
                        />
                      </Field>
                      <Field label="Повторите новый пароль">
                        <Input
                          value={recoveryPasswordConfirm}
                          onChange={(e) => setRecoveryPasswordConfirm(e.target.value)}
                          type="password"
                          autoComplete="new-password"
                          minLength={12}
                        />
                      </Field>
                      <p className={homeStyles["home-muted"]}>Endpoint: {recoveryEndpoint}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className={settingsStyles["acme-note"]}>
                  Нажмите «Запустить setup». Мастер применит миграции, создаст первого пользователя и
                  сгенерирует итоговые секреты.
                </p>
              )}
            </div>
          ) : null}

          {step === SUMMARY_STEP ? (
            <div className={settingsStyles["settings-grid"]}>
              {emergencyRecoveredEmail ? (
                <div className={settingsStyles["acme-note"]}>
                  <p className={homeStyles["home-inline-title"]}>Пароль успешно сброшен</p>
                  <p className={homeStyles["home-muted"]}>
                    Логин для входа: <code>{emergencyRecoveredEmail}</code>
                  </p>
                  <nav className={homeStyles["home-links"]}>
                    <a
                      href={`/login?email=${encodeURIComponent(emergencyRecoveredEmail)}`}
                      className={homeStyles["home-link"]}
                    >
                      Открыть /login
                    </a>
                  </nav>
                </div>
              ) : null}

              {done && summary ? <SummaryTable summary={summary} /> : null}

              {summary ? (
                <div className={settingsStyles["acme-note"]}>
                  <p className={homeStyles["home-inline-title"]}>Обязательные шаги после завершения</p>
                  <ol className={`${settingsStyles["setup-list"]} ${settingsStyles["setup-list-decimal"]}`}>
                    <li>Откройте Variables.</li>
                    <li>Вставьте значения из сводки: DATABASE_URL и NETDEN_SESSION_SECRET.</li>
                    <li>Сделайте redeploy приложения.</li>
                    <li>После redeploy авторизуйтесь через /login.</li>
                  </ol>
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <div className={homeStyles["notes-error"]}>
              <p>{error}</p>
            </div>
          ) : null}

          <div className={`${homeStyles["home-card-head"]} ${settingsStyles["setup-nav"]}`}>
            <Button kind="ghost" onClick={previousStep} disabled={busy || done || step === 0}>
              Назад
            </Button>
            <Button onClick={nextStep} disabled={!canProceed}>
              {actionLabel()}
            </Button>
          </div>
        </section>

        <p className={homeStyles["home-muted"]}>
          В этом режиме значения не сохраняются на диске контейнера: финальная сводка предназначена
          для ручного переноса в Variables.
        </p>
      </div>
    </div>
  );
}
