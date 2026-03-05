"use client";

import styles from "@/styles/settings.module.css";

export default function SettingsCalendarTab() {
  const handleExportAll = () => {
    window.open("/api/events/export.ics", "_blank", "noopener,noreferrer");
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
          className={styles["settings-tab-btn"]}
        >
          Export .ics
        </button>
      </div>
    </div>
  );
}
