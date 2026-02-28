"use client";

import { ChangeEvent } from "react";
import type { AgentSettings as AgentSettingsType } from "@/agent/types";

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
    <div className="terminal-entry terminal-entry-slash nd-animate-in">
      <div className="terminal-command-row">
        <span className="terminal-command-text">Agent settings</span>
      </div>
      <div className="terminal-output">
        <label className="terminal-output-line">
          Имя агента
          <input
            className="terminal-auth-input"
            value={value.profile.name}
            onChange={onNameChange}
            placeholder="Нова"
          />
        </label>

        <label className="terminal-output-line">
          Стиль
          <select className="terminal-auth-input" value={value.profile.style} onChange={onStyleChange}>
            <option value="friendly">friendly</option>
            <option value="balanced">balanced</option>
            <option value="formal">formal</option>
          </select>
        </label>

        <label className="terminal-output-line">
          Роль пользователя
          <input
            className="terminal-auth-input"
            value={value.role ?? ""}
            onChange={onRoleChange}
            placeholder="Team lead"
          />
        </label>

        <label className="terminal-output-line">
          <input type="checkbox" checked={value.profile.adaptTone} onChange={onToneToggle} />
          Адаптировать тон к пользователю
        </label>
      </div>
    </div>
  );
}
