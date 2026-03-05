"use client";

import { useState } from "react";
import styles from "@/styles/settings.module.css";

export default function SettingsCalendarTab() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    </div>
  );
}
