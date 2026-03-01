"use client";

import type { AgentActionProposal } from "@/agent/types";
import styles from "@/components/Terminal.module.css";

interface ConfirmActionProps {
  action: AgentActionProposal;
  onConfirm: () => void;
  onDecline: () => void;
  disabled?: boolean;
}

export default function ConfirmAction({ action, onConfirm, onDecline, disabled = false }: ConfirmActionProps) {
  return (
    <div className={`${styles['terminal-entry']} ${styles['terminal-entry-slash']} nd-animate-in`}>
      <div className={styles['terminal-command-row']}>
        <span className={styles['terminal-command-text']}>Action pending</span>
      </div>
      <div className={styles['terminal-output']}>
        <div className={styles['terminal-output-line']}>{action.summary}</div>
        <div className={styles['terminal-output-line']}>Expires: {new Date(action.expiresAt).toLocaleString()}</div>
      </div>
      <div className={styles['terminal-mode-toggle']} style={{ marginTop: 8 }}>
        <button
          type="button"
          className={styles['terminal-mode-button']}
          onClick={onConfirm}
          disabled={disabled}
          aria-label="Подтвердить действие"
        >
          Подтвердить
        </button>
        <button
          type="button"
          className={styles['terminal-mode-button']}
          onClick={onDecline}
          disabled={disabled}
          aria-label="Отклонить действие"
        >
          Отклонить
        </button>
      </div>
    </div>
  );
}
