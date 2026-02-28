"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

interface OpenRouterModelOption {
  id: string;
  label: string;
}

type OpenRouterStatus = "unknown" | "valid" | "invalid";

interface OpenRouterConfigView {
  hasKey: boolean;
  keyMask: string | null;
  status: OpenRouterStatus;
  model: string;
  lastValidatedAt: string | null;
}

export default function SettingsApiTab() {
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [openRouterConfig, setOpenRouterConfig] = useState<OpenRouterConfigView>({
    hasKey: false,
    keyMask: null,
    status: "unknown",
    model: "openai/gpt-4o-mini",
    lastValidatedAt: null,
  });
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModelOption[]>([]);
  const [openRouterBusy, setOpenRouterBusy] = useState(false);
  const [openRouterError, setOpenRouterError] = useState<string | null>(null);
  const [openRouterNotice, setOpenRouterNotice] = useState<string | null>(null);

  useEffect(() => {
    const loadOpenRouterSettings = async () => {
      setOpenRouterBusy(true);
      setOpenRouterError(null);
      setOpenRouterNotice(null);
      try {
        const response = await fetch("/api/agent/openrouter", {
          method: "GET",
          headers: { "content-type": "application/json" },
        });

        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; message?: string; config?: OpenRouterConfigView; models?: OpenRouterModelOption[] }
          | null;

        if (!response.ok || !payload?.ok || !payload.config) {
          const message = payload?.message || `OpenRouter settings error (${response.status})`;
          throw new Error(message);
        }

        setOpenRouterConfig(payload.config);
        setOpenRouterModels(Array.isArray(payload.models) ? payload.models : []);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Не удалось загрузить OpenRouter настройки";
        setOpenRouterError(message);
      } finally {
        setOpenRouterBusy(false);
      }
    };

    void loadOpenRouterSettings();
  }, []);

  const openRouterStatusLabel = useMemo(() => {
    if (openRouterConfig.status === "valid") return "Ключ валидный";
    if (openRouterConfig.status === "invalid") return "Ключ невалидный";
    return "Ключ не проверен";
  }, [openRouterConfig.status]);

  const openRouterLampClass = useMemo(() => {
    if (openRouterConfig.status === "valid") return "agent-status-lamp agent-status-lamp-valid";
    if (openRouterConfig.status === "invalid") return "agent-status-lamp agent-status-lamp-invalid";
    return "agent-status-lamp";
  }, [openRouterConfig.status]);

  const saveOpenRouterKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (openRouterBusy) return;

    const normalized = openRouterKey.trim();
    if (!normalized) {
      setOpenRouterError("Введите OpenRouter API key.");
      return;
    }

    setOpenRouterBusy(true);
    setOpenRouterError(null);
    setOpenRouterNotice(null);

    try {
      const response = await fetch("/api/agent/openrouter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save_key", apiKey: normalized }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; config?: OpenRouterConfigView; models?: OpenRouterModelOption[]; validation?: { valid?: boolean } }
        | null;

      if (!response.ok || !payload?.ok || !payload.config) {
        const message = payload?.message || `OpenRouter save error (${response.status})`;
        throw new Error(message);
      }

      setOpenRouterConfig(payload.config);
      setOpenRouterModels(Array.isArray(payload.models) ? payload.models : []);
      setOpenRouterKey("");
      setOpenRouterNotice(
        payload.validation?.valid
          ? "Ключ сохранён и успешно проверен."
          : "Ключ сохранён, но проверка не пройдена.",
      );
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Не удалось сохранить ключ";
      setOpenRouterError(message);
    } finally {
      setOpenRouterBusy(false);
    }
  };

  const clearOpenRouterKey = async () => {
    if (openRouterBusy) return;

    setOpenRouterBusy(true);
    setOpenRouterError(null);
    setOpenRouterNotice(null);
    try {
      const response = await fetch("/api/agent/openrouter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "clear_key" }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; config?: OpenRouterConfigView }
        | null;

      if (!response.ok || !payload?.ok || !payload.config) {
        const message = payload?.message || `OpenRouter clear error (${response.status})`;
        throw new Error(message);
      }

      setOpenRouterConfig(payload.config);
      setOpenRouterModels([]);
      setOpenRouterNotice("Ключ удалён.");
    } catch (clearError) {
      const message = clearError instanceof Error ? clearError.message : "Не удалось удалить ключ";
      setOpenRouterError(message);
    } finally {
      setOpenRouterBusy(false);
    }
  };

  const refreshOpenRouterModels = async () => {
    if (openRouterBusy) return;
    setOpenRouterBusy(true);
    setOpenRouterError(null);
    setOpenRouterNotice(null);

    try {
      const response = await fetch("/api/agent/openrouter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "refresh_models" }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; models?: OpenRouterModelOption[] }
        | null;

      if (!response.ok || !payload?.ok) {
        const message = payload?.message || `OpenRouter models error (${response.status})`;
        throw new Error(message);
      }

      setOpenRouterModels(Array.isArray(payload.models) ? payload.models : []);
      setOpenRouterNotice("Список моделей обновлён.");
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : "Не удалось обновить модели";
      setOpenRouterError(message);
    } finally {
      setOpenRouterBusy(false);
    }
  };

  const updateOpenRouterModel = async (nextModel: string) => {
    if (openRouterBusy) return;
    setOpenRouterBusy(true);
    setOpenRouterError(null);
    setOpenRouterNotice(null);
    try {
      const response = await fetch("/api/agent/openrouter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set_model", model: nextModel }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; config?: OpenRouterConfigView }
        | null;

      if (!response.ok || !payload?.ok || !payload.config) {
        const message = payload?.message || `OpenRouter model error (${response.status})`;
        throw new Error(message);
      }

      setOpenRouterConfig(payload.config);
      setOpenRouterNotice(`Модель сохранена: ${payload.config.model}`);
    } catch (modelError) {
      const message = modelError instanceof Error ? modelError.message : "Не удалось сохранить модель";
      setOpenRouterError(message);
    } finally {
      setOpenRouterBusy(false);
    }
  };

  return (
    <div className="settings-tab-content">
      <form className="settings-grid" onSubmit={saveOpenRouterKey}>
        <label className="settings-field">
          <span>OpenRouter API key</span>
          <input
            className="settings-tab-input"
            type="password"
            value={openRouterKey}
            onChange={(event) => setOpenRouterKey(event.target.value)}
            placeholder="sk-or-***"
            autoComplete="off"
          />
        </label>

        <div className="settings-inline">
          <button type="submit" className="settings-tab-btn" disabled={openRouterBusy}>
            {openRouterBusy ? "Проверка..." : "Сохранить и проверить ключ"}
          </button>

          <button
            type="button"
            className="settings-tab-btn-secondary"
            onClick={() => void clearOpenRouterKey()}
            disabled={openRouterBusy || !openRouterConfig.hasKey}
          >
            Удалить ключ
          </button>
        </div>
      </form>

      <div className="settings-tab-card">
        <p className="settings-tab-card-title">Статус ключа</p>
        <p className="settings-tab-card-body">
          <span className={openRouterLampClass} aria-hidden /> {openRouterStatusLabel}
        </p>
        <p className="settings-tab-card-meta">
          {openRouterConfig.keyMask ? `Подключён: ${openRouterConfig.keyMask}` : "Ключ не подключён"}
        </p>
      </div>

      <div className="settings-grid">
        <label className="settings-field">
          <span>Модель по умолчанию</span>
          <select
            className="settings-tab-input"
            value={openRouterConfig.model}
            onChange={(event) => void updateOpenRouterModel(event.target.value)}
            disabled={openRouterBusy || openRouterModels.length === 0}
          >
            <option value={openRouterConfig.model}>{openRouterConfig.model}</option>
            {openRouterModels
              .filter((item) => item.id !== openRouterConfig.model)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
          </select>
        </label>

        <button
          type="button"
          className="settings-tab-btn"
          onClick={() => void refreshOpenRouterModels()}
          disabled={openRouterBusy || !openRouterConfig.hasKey}
        >
          Обновить список моделей
        </button>
      </div>

      {openRouterError ? <p className="settings-tab-error">{openRouterError}</p> : null}
      {openRouterNotice ? <p className="settings-tab-muted">{openRouterNotice}</p> : null}
      <p className="settings-tab-muted">Ключ хранится на сервере в зашифрованном виде и не пишется в `.env`.</p>
    </div>
  );
}
