"use client";

import { useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import styles from "@/styles/settings.module.css";

function formatPermission(permission: NotificationPermission | "unsupported"): string {
  if (permission === "granted") return "Granted";
  if (permission === "denied") return "Denied";
  if (permission === "default") return "Not requested";
  return "Unsupported";
}

export default function SettingsCalendarTab() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushNotice, setPushNotice] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const push = usePushNotifications();

  const handleExportAll = async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    setError(null);
    try {
      const response = await fetch("/api/events/export.ics", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          const loginUrl = new URL("/login", window.location.origin);
          loginUrl.searchParams.set("from", window.location.pathname);
          loginUrl.searchParams.set("reason", "session");
          window.location.assign(loginUrl.toString());
          return;
        }

        let message = `HTTP ${response.status}`;
        try {
          const body = (await response.json()) as { message?: string; error?: string };
          message = body.message ?? body.error ?? message;
        } catch {
          // keep default message
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const filename =
        response.headers
          .get("content-disposition")
          ?.match(/filename="?([^"]+)"?/)?.[1] ?? "netden-calendar.ics";

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось экспортировать .ics");
    } finally {
      setIsExporting(false);
    }
  };

  const handleEnablePush = async () => {
    if (push.isBusy) return;
    setPushError(null);
    setPushNotice(null);
    const result = await push.subscribe();
    if (result.ok) {
      setPushNotice(result.message);
      return;
    }
    setPushError(result.message);
  };

  const handleDisablePush = async () => {
    if (push.isBusy) return;
    setPushError(null);
    setPushNotice(null);
    const result = await push.unsubscribe();
    if (result.ok) {
      setPushNotice(result.message);
      return;
    }
    setPushError(result.message);
  };

  const handleSendTest = async () => {
    if (push.isBusy) return;
    setPushError(null);
    setPushNotice(null);
    const result = await push.sendTest("NetDen test notification");
    if (result.ok) {
      setPushNotice(result.message);
      return;
    }
    setPushError(result.message);
  };

  const handleRecheck = async () => {
    if (push.isBusy) return;
    setPushError(null);
    setPushNotice(null);
    try {
      await push.recheck();
      setPushNotice("Push diagnostics updated");
    } catch (recheckError) {
      setPushError(recheckError instanceof Error ? recheckError.message : "Failed to refresh push diagnostics");
    }
  };

  return (
    <div className={styles["settings-tab-content"]}>
      <div className={styles["settings-tab-card"]}>
        <p className={styles["settings-tab-card-title"]}>Экспорт календаря (.ics)</p>
        <p className={styles["settings-tab-card-body"]}>
          Экспортирует все события текущего пользователя в формате iCalendar.
        </p>
        <button
          type="button"
          onClick={handleExportAll}
          disabled={isExporting}
          className={styles["settings-tab-btn"]}
        >
          {isExporting ? "Экспорт..." : "Export .ics"}
        </button>
        {error ? <p className={styles["settings-tab-error"]}>{error}</p> : null}
      </div>

      <div className={styles["settings-tab-card"]}>
        <p className={styles["settings-tab-card-title"]}>Push Notifications</p>
        <p className={styles["settings-tab-card-body"]}>
          Управление browser push-уведомлениями и диагностика контура reminders.
        </p>

        <div className={styles["settings-grid"]}>
          <div className={styles["settings-tab-row"]}>
            <span className={styles["settings-tab-label"]}>Server configured</span>
            <span className={styles["settings-tab-value"]}>
              {push.diagnostics.isLoading ? "Checking..." : push.diagnostics.configured ? "Yes" : "No"}
            </span>
          </div>
          <div className={styles["settings-tab-row"]}>
            <span className={styles["settings-tab-label"]}>Browser supported</span>
            <span className={styles["settings-tab-value"]}>{push.supported ? "Yes" : "No"}</span>
          </div>
          <div className={styles["settings-tab-row"]}>
            <span className={styles["settings-tab-label"]}>Permission</span>
            <span className={styles["settings-tab-value"]}>{formatPermission(push.permission)}</span>
          </div>
          <div className={styles["settings-tab-row"]}>
            <span className={styles["settings-tab-label"]}>Subscribed</span>
            <span className={styles["settings-tab-value"]}>{push.isSubscribed ? "Yes" : "No"}</span>
          </div>
          <div className={styles["settings-tab-row"]}>
            <span className={styles["settings-tab-label"]}>Cron readiness</span>
            <span className={styles["settings-tab-value"]}>{push.diagnostics.cronConfigured ? "Ready" : "Missing secret"}</span>
          </div>
        </div>

        <div className={styles["settings-choice-row"]}>
          <button
            type="button"
            className={styles["settings-tab-btn"]}
            onClick={() => void handleEnablePush()}
            disabled={push.isBusy || !push.supported || push.isSubscribed}
          >
            {push.isBusy ? "Working..." : "Enable push"}
          </button>
          <button
            type="button"
            className={styles["settings-tab-btn-secondary"]}
            onClick={() => void handleDisablePush()}
            disabled={push.isBusy || !push.supported || !push.isSubscribed}
          >
            Disable push
          </button>
          <button
            type="button"
            className={styles["settings-tab-btn-secondary"]}
            onClick={() => void handleSendTest()}
            disabled={push.isBusy || !push.supported || !push.isSubscribed}
          >
            Send test
          </button>
          <button
            type="button"
            className={styles["settings-tab-btn-secondary"]}
            onClick={() => void handleRecheck()}
            disabled={push.isBusy || push.diagnostics.isLoading}
          >
            Recheck
          </button>
        </div>

        {!push.diagnostics.configured && !push.diagnostics.isLoading ? (
          <div className={styles["settings-tab-note"]}>
            <p className={styles["settings-tab-card-meta"]}>
              Push server не настроен. Проверьте переменные окружения:
            </p>
            {push.diagnostics.missing.length > 0 ? (
              <ul className={`${styles["setup-list"]} ${styles["setup-list-disc"]}`}>
                {push.diagnostics.missing.map((item) => (
                  <li key={`missing-${item}`}>{item}</li>
                ))}
              </ul>
            ) : null}
            {push.diagnostics.invalid.length > 0 ? (
              <ul className={`${styles["setup-list"]} ${styles["setup-list-disc"]}`}>
                {push.diagnostics.invalid.map((item) => (
                  <li key={`invalid-${item}`}>{item} (invalid value)</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {push.diagnostics.error ? (
          <p className={styles["settings-tab-note"]}>Diagnostics error: {push.diagnostics.error}</p>
        ) : null}
        {pushError ? <p className={styles["settings-tab-note"]}>{pushError}</p> : null}
        {pushNotice ? <p className={styles["settings-tab-muted"]}>{pushNotice}</p> : null}
        <p className={styles["settings-tab-muted"]}>
          Для auto-reminders запускайте внешний cron: <code>POST /api/cron/reminders</code> с заголовком{" "}
          <code>x-netden-cron-secret</code> (например, каждые 5 минут).
        </p>
      </div>
    </div>
  );
}
