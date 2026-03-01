"use client";

import type { AgentActionProposal } from "@/agent/types";
import type { AgentUIMessage } from "@/hooks/useAgent";
import ConfirmAction from "@/components/ConfirmAction";
import StreamingMessage from "@/components/StreamingMessage";
import styles from "@/components/Terminal.module.css";

interface AgentConsoleProps {
  messages: AgentUIMessage[];
  pendingAction: AgentActionProposal | null;
  isStreaming: boolean;
  onResolveAction: (approved: boolean) => void;
}

export default function AgentConsole({
  messages,
  pendingAction,
  isStreaming,
  onResolveAction,
}: AgentConsoleProps) {
  if (messages.length === 0 && !pendingAction) {
    return null;
  }

  return (
    <div className={`${styles['terminal-entry']} ${styles['terminal-entry-slash']} nd-animate-in`}>
      <div className={styles['terminal-command-row']}>
        <span className={styles['terminal-command-text']}>AI Agent</span>
      </div>

      <div className={styles['terminal-output']}>
        {messages.map((message) => (
          <div key={message.id} className={styles['terminal-output-line']}>
            <strong>{message.role === "user" ? "you" : "agent"}:</strong>{" "}
            <StreamingMessage text={message.text} isStreaming={Boolean(message.streaming)} />
          </div>
        ))}

        {isStreaming ? <div className={styles['terminal-output-line']}>Streaming...</div> : null}
      </div>

      {pendingAction ? (
        <ConfirmAction
          action={pendingAction}
          disabled={isStreaming}
          onConfirm={() => onResolveAction(true)}
          onDecline={() => onResolveAction(false)}
        />
      ) : null}
    </div>
  );
}
