"use client";

import type { AgentActionProposal } from "@/agent/types";

interface ConfirmActionProps {
  action: AgentActionProposal;
  onConfirm: () => void;
  onDecline: () => void;
  disabled?: boolean;
}

export default function ConfirmAction({ action, onConfirm, onDecline, disabled = false }: ConfirmActionProps) {
  return (
    <div className="terminal-entry terminal-entry-slash nd-animate-in">
      <div className="terminal-command-row">
        <span className="terminal-command-text">Action pending</span>
      </div>
      <div className="terminal-output">
        <div className="terminal-output-line">{action.summary}</div>
        <div className="terminal-output-line">Expires: {new Date(action.expiresAt).toLocaleString()}</div>
      </div>
      <div className="terminal-mode-toggle" style={{ marginTop: 8 }}>
        <button
          type="button"
          className="terminal-mode-button"
          onClick={onConfirm}
          disabled={disabled}
          aria-label="Подтвердить действие"
        >
          Подтвердить
        </button>
        <button
          type="button"
          className="terminal-mode-button"
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
