import { describe, expect, it } from "vitest";
import type { AgentMessage } from "@/agent/types";
import {
  extractMeetingAvailabilityQuery,
  extractMeetingDraftFromConversation,
  findMeetingConflict,
} from "@/agent/calendarDeterministic";
import type { CalendarEvent } from "@/lib/types";

const NOW_ISO = "2026-02-28T10:00:00.000Z";
const TIMEZONE = "Europe/Moscow";

describe("calendarDeterministic", () => {
  it("extracts explicit meeting creation request with exact time", () => {
    const draft = extractMeetingDraftFromConversation({
      message: "создай на завтра встречу в 15 00 с директором магазина",
      history: [],
      nowIso: NOW_ISO,
      timezone: TIMEZONE,
    });

    expect(draft).toEqual({
      title: "Встреча с директором магазина",
      description: "",
      date: "2026-03-01",
      time: "15:00",
    });
  });

  it("uses previous meeting context for continuation time", () => {
    const history: AgentMessage[] = [
      {
        role: "user",
        content: "создай на завтра встречу в 15 00 с директором магазина",
      },
      {
        role: "assistant",
        content: "На 2026-03-01 в 15:00 уже есть встреча.",
      },
    ];

    const draft = extractMeetingDraftFromConversation({
      message: "тогда на 16 00",
      history,
      nowIso: NOW_ISO,
      timezone: TIMEZONE,
    });

    expect(draft).toEqual({
      title: "Встреча с директором магазина",
      description: "",
      date: "2026-03-01",
      time: "16:00",
    });
  });

  it("does not intercept non-meeting creation requests", () => {
    const draft = extractMeetingDraftFromConversation({
      message: "создай задачу на завтра в 15 00",
      history: [],
      nowIso: NOW_ISO,
      timezone: TIMEZONE,
    });

    expect(draft).toBeNull();
  });

  it("extracts meeting availability query", () => {
    const query = extractMeetingAvailabilityQuery({
      message: "есть встреча на завтра?",
      nowIso: NOW_ISO,
      timezone: TIMEZONE,
    });

    expect(query).toEqual({
      date: "2026-03-01",
      time: undefined,
    });
  });

  it("checks conflicts only by exact date and time", () => {
    const events: CalendarEvent[] = [
      {
        id: "evt-1",
        title: "Без времени",
        description: "",
        date: "2026-03-01",
        type: "event",
        status: "pending",
      },
      {
        id: "evt-2",
        title: "Встреча в 15",
        description: "",
        date: "2026-03-01",
        time: "15:00",
        type: "event",
        status: "pending",
      },
    ];

    expect(findMeetingConflict(events, "2026-03-01", "16:00")).toBeNull();
    expect(findMeetingConflict(events, "2026-03-01", "15:00")?.id).toBe("evt-2");
  });
});
