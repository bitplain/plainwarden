"use client";

import { useEffect, useState } from "react";
import styles from "@/styles/settings.module.css";
import {
  readUiPreferences,
  saveUiPreferences,
  subscribeUiPreferences,
  type UiDensity,
  type UiMotion,
  type UiPreferences,
  type UiSidebarDefaultDesktop,
} from "@/components/settings/settings-ui-preferences";

function ChoiceButton(props: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  const { active, label, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles["settings-tab-btn-secondary"]} ${
        active ? styles["settings-tab-choice-active"] : ""
      }`}
    >
      {label}
    </button>
  );
}

export default function SettingsCliTab() {
  const [preferences, setPreferences] = useState<UiPreferences>(() => readUiPreferences());

  useEffect(() => subscribeUiPreferences(setPreferences), []);

  const updatePreferences = (patch: Partial<UiPreferences>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    saveUiPreferences(next);
  };

  const updateDensity = (density: UiDensity) => updatePreferences({ density });
  const updateMotion = (motion: UiMotion) => updatePreferences({ motion });
  const updateSidebarDefault = (sidebarDefaultDesktop: UiSidebarDefaultDesktop) =>
    updatePreferences({ sidebarDefaultDesktop });

  return (
    <div className={styles["settings-tab-content"]}>
      <div className={styles["settings-tab-card"]}>
        <p className={styles["settings-tab-card-title"]}>Плотность интерфейса</p>
        <p className={styles["settings-tab-card-body"]}>
          Управляет размером и плотностью элементов в рабочих экранах.
        </p>
        <div className={styles["settings-choice-row"]}>
          <ChoiceButton
            active={preferences.density === "comfortable"}
            label="Comfortable"
            onClick={() => updateDensity("comfortable")}
          />
          <ChoiceButton
            active={preferences.density === "compact"}
            label="Compact"
            onClick={() => updateDensity("compact")}
          />
        </div>
      </div>

      <div className={styles["settings-tab-card"]}>
        <p className={styles["settings-tab-card-title"]}>Анимации</p>
        <p className={styles["settings-tab-card-body"]}>
          Выберите стандартную анимацию или уменьшенное движение.
        </p>
        <div className={styles["settings-choice-row"]}>
          <ChoiceButton
            active={preferences.motion === "standard"}
            label="Standard"
            onClick={() => updateMotion("standard")}
          />
          <ChoiceButton
            active={preferences.motion === "reduced"}
            label="Reduced"
            onClick={() => updateMotion("reduced")}
          />
        </div>
      </div>

      <div className={styles["settings-tab-card"]}>
        <p className={styles["settings-tab-card-title"]}>Панель календаря</p>
        <p className={styles["settings-tab-card-body"]}>
          Настройка поведения левой панели для desktop-режима.
        </p>
        <label className={styles["settings-tab-checkbox"]}>
          <input
            type="checkbox"
            checked={preferences.sidebarRemember}
            onChange={(event) => updatePreferences({ sidebarRemember: event.target.checked })}
          />
          <span>Запоминать последнее состояние панели</span>
        </label>
        <div className={styles["settings-choice-row"]}>
          <ChoiceButton
            active={preferences.sidebarDefaultDesktop === "open"}
            label="Desktop: open"
            onClick={() => updateSidebarDefault("open")}
          />
          <ChoiceButton
            active={preferences.sidebarDefaultDesktop === "closed"}
            label="Desktop: closed"
            onClick={() => updateSidebarDefault("closed")}
          />
        </div>
      </div>
    </div>
  );
}
