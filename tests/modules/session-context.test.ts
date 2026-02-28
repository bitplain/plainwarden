import { describe, expect, it, beforeEach } from "vitest";
import {
  getOrCreateSession,
  trackSessionEvent,
  getSessionEvents,
  logAction,
  getActionLog,
  clearAllSessions,
} from "@/modules/core/session-context";
import type { SessionEvent, ActionLogEntry } from "@/modules/core/shared-types";

describe("session context", () => {
  beforeEach(() => {
    clearAllSessions();
  });

  it("creates a new session", () => {
    const session = getOrCreateSession("sess-1", "user-1");
    expect(session.sessionId).toBe("sess-1");
    expect(session.userId).toBe("user-1");
    expect(session.events).toHaveLength(0);
    expect(session.startedAt).toBeDefined();
  });

  it("returns existing session on second call", () => {
    const s1 = getOrCreateSession("sess-1", "user-1");
    const s2 = getOrCreateSession("sess-1", "user-1");
    expect(s1.startedAt).toBe(s2.startedAt);
  });

  it("tracks events in session", () => {
    getOrCreateSession("sess-2", "user-1");
    const event: SessionEvent = {
      type: "created",
      itemType: "note",
      itemId: "note-1",
      timestamp: new Date().toISOString(),
    };
    trackSessionEvent("sess-2", event);

    const events = getSessionEvents("sess-2");
    expect(events).toHaveLength(1);
    expect(events[0].itemId).toBe("note-1");
  });

  it("does not track events for unknown session", () => {
    trackSessionEvent("unknown-sess", {
      type: "created",
      itemType: "task",
      itemId: "task-1",
      timestamp: new Date().toISOString(),
    });
    expect(getSessionEvents("unknown-sess")).toHaveLength(0);
  });

  it("logs actions and retrieves by session", () => {
    const entry: ActionLogEntry = {
      id: "action-1",
      sessionId: "sess-3",
      toolName: "calendar_create_event",
      args: { title: "Meeting", date: "2026-03-01" },
      result: { ok: true, data: { id: "evt-1" } },
      createdAt: new Date().toISOString(),
    };
    logAction(entry);

    const log = getActionLog("sess-3");
    expect(log).toHaveLength(1);
    expect(log[0].toolName).toBe("calendar_create_event");
  });

  it("filters action log by session", () => {
    logAction({
      id: "a1",
      sessionId: "sess-a",
      toolName: "notes_create",
      args: {},
      result: { ok: true },
      createdAt: new Date().toISOString(),
    });
    logAction({
      id: "a2",
      sessionId: "sess-b",
      toolName: "journal_create",
      args: {},
      result: { ok: true },
      createdAt: new Date().toISOString(),
    });

    expect(getActionLog("sess-a")).toHaveLength(1);
    expect(getActionLog("sess-b")).toHaveLength(1);
    expect(getActionLog("sess-c")).toHaveLength(0);
  });

  it("clears all sessions", () => {
    getOrCreateSession("sess-10", "user-1");
    trackSessionEvent("sess-10", {
      type: "created",
      itemType: "event",
      itemId: "evt-1",
      timestamp: new Date().toISOString(),
    });
    logAction({
      id: "act-1",
      sessionId: "sess-10",
      toolName: "test",
      args: {},
      result: { ok: true },
      createdAt: new Date().toISOString(),
    });

    clearAllSessions();
    expect(getSessionEvents("sess-10")).toHaveLength(0);
    expect(getActionLog("sess-10")).toHaveLength(0);
  });
});
