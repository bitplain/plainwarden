/**
 * AI Core Session Context — tracks events within a user session.
 * Provides MVP memory for AI to understand what happened during interaction.
 */

import type { SessionContext, SessionEvent, ActionLogEntry } from "@/modules/core/shared-types";

const sessions = new Map<string, SessionContext>();
const actionLogs: ActionLogEntry[] = [];

const MAX_SESSION_EVENTS = 200;
const MAX_ACTION_LOG_ENTRIES = 500;

export function getOrCreateSession(sessionId: string, userId: string): SessionContext {
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      userId,
      events: [],
      startedAt: new Date().toISOString(),
    };
    sessions.set(sessionId, session);
  }
  return session;
}

export function trackSessionEvent(sessionId: string, event: SessionEvent): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.events.push(event);
  if (session.events.length > MAX_SESSION_EVENTS) {
    session.events = session.events.slice(-MAX_SESSION_EVENTS);
  }
}

export function getSessionEvents(sessionId: string): SessionEvent[] {
  return sessions.get(sessionId)?.events ?? [];
}

export function logAction(entry: ActionLogEntry): void {
  actionLogs.push(entry);
  if (actionLogs.length > MAX_ACTION_LOG_ENTRIES) {
    actionLogs.splice(0, actionLogs.length - MAX_ACTION_LOG_ENTRIES);
  }
}

export function getActionLog(sessionId: string): ActionLogEntry[] {
  return actionLogs.filter((entry) => entry.sessionId === sessionId);
}

export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function clearAllSessions(): void {
  sessions.clear();
  actionLogs.splice(0);
}
