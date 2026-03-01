"use client";

import { ChangeEvent } from "react";
import type { AgentSettings as AgentSettingsType } from "@/agent/types";
import styles from "@/components/Terminal.module.css";

interface AgentSettingsProps {
  value: AgentSettingsType;
  onChange: (next: AgentSettingsType) => void;
}

export default function AgentSettings({ value, onChange }: AgentSettingsProps) {
  const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      profile: {
        ...value.profile,
        name: event.target.value,
      },
    });
  };

  const onStyleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...value,
      profile: {
        ...value.profile,
        style: event.target.value as AgentSettingsType["profile"]["style"],
      },
    });
  };

  const onRoleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      role: event.target.value,
    });
  };

  const onToneToggle = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      profile: {
        ...value.profile,
        adaptTone: event.target.checked,
      },
    });
  };

  return (
    <div className={`${styles['terminal-entry']} ${styles['terminal-entry-slash']} nd-animate-in`}>
      <div className={styles['terminal-command-row']}>
        <span className={styles['terminal-command-text']}>Agent settings</span>
      </div>
      <div className={styles['terminal-output']}>
        <label className={styles['terminal-output-line']}>
          Имя агента
          <input
            className={styles['terminal-auth-input']}
            value={value.profile.name}
            onChange={onNameChange}
            placeholder="Нова"
          />
        </label>

        <label className={styles['terminal-output-line']}>
          Стиль
          <select className={styles['terminal-auth-input']} value={value.profile.style} onChange={onStyleChange}>
            <option value="friendly">friendly</option>
            <option value="balanced">balanced</option>
            <option value="formal">formal</option>
          </select>
        </label>

        <label className={styles['terminal-output-line']}>
          Роль пользователя
          <input
            className={styles['terminal-auth-input']}
            value={value.role ?? ""}
            onChange={onRoleChange}
            placeholder="Team lead"
          />
        </label>

        <label className={styles['terminal-output-line']}>
          <input type="checkbox" checked={value.profile.adaptTone} onChange={onToneToggle} />
          Адаптировать тон к пользователю
        </label>
      </div>
    </div>
  );
}
