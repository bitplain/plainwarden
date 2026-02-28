"use client";

import type { AgentActionProposal } from "@/agent/types";
import type { AgentUIMessage } from "@/hooks/useAgent";
import ConfirmAction from "@/components/ConfirmAction";
import StreamingMessage from "@/components/StreamingMessage";

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
    <div className="terminal-entry terminal-entry-slash nd-animate-in">
      <div className="terminal-command-row">
        <span className="terminal-command-text">AI Agent</span>
      </div>

      <div className="terminal-output">
        {messages.map((message) => (
          <div key={message.id} className="terminal-output-line">
            <strong>{message.role === "user" ? "you" : "agent"}:</strong>{" "}
            <StreamingMessage text={message.text} isStreaming={Boolean(message.streaming)} />
          </div>
        ))}

        {isStreaming ? <div className="terminal-output-line">Streaming...</div> : null}
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
