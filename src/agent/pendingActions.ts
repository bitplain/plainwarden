import { randomUUID } from "node:crypto";
import type { AgentActionProposal } from "@/agent/types";

interface StoredPendingAction extends AgentActionProposal {
  userId: string;
}

const ACTION_TTL_MS = 15 * 60 * 1000;
const pendingActions = new Map<string, StoredPendingAction>();

function cleanupExpired() {
  const now = Date.now();
  for (const [actionId, action] of pendingActions.entries()) {
    if (new Date(action.expiresAt).getTime() <= now) {
      pendingActions.delete(actionId);
    }
  }
}

export function createPendingAction(input: {
  userId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  summary: string;
}): AgentActionProposal {
  cleanupExpired();

  const createdAt = new Date();
  const proposal: StoredPendingAction = {
    id: randomUUID(),
    toolName: input.toolName,
    arguments: input.arguments,
    summary: input.summary,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + ACTION_TTL_MS).toISOString(),
    userId: input.userId,
  };

  pendingActions.set(proposal.id, proposal);
  return proposal;
}

export function getPendingAction(actionId: string, userId: string): AgentActionProposal | null {
  cleanupExpired();
  const action = pendingActions.get(actionId);
  if (!action || action.userId !== userId) {
    return null;
  }
  return action;
}

export function removePendingAction(actionId: string): void {
  pendingActions.delete(actionId);
}
