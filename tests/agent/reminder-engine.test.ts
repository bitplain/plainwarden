import { describe, expect, it } from "vitest";
import type { ReminderCandidateInput } from "@/lib/server/reminder-engine";
import { buildReminderCandidates } from "@/lib/server/reminder-engine";

describe("buildReminderCandidates", () => {
  it("classifies overdue, today and tomorrow reminders", () => {
    const nowIso = "2026-02-28T10:00:00.000Z";

    const items: ReminderCandidateInput[] = [
      {
        sourceType: "calendar_event",
        sourceId: "evt-overdue",
        title: "Просроченная задача",
        dueDate: "2026-02-27",
        navigateTo: "/calendar",
      },
      {
        sourceType: "calendar_event",
        sourceId: "evt-today",
        title: "Сегодняшняя задача",
        dueDate: "2026-02-28",
        navigateTo: "/calendar",
      },
      {
        sourceType: "kanban_card",
        sourceId: "card-tomorrow",
        title: "Карточка на завтра",
        dueDate: "2026-03-01",
        navigateTo: "/kanban",
      },
    ];

    const reminders = buildReminderCandidates({
      userId: "u1",
      nowIso,
      items,
    });

    expect(reminders).toHaveLength(3);
    expect(reminders[0].kind).toBe("overdue");
    expect(reminders[1].kind).toBe("due_today");
    expect(reminders[2].kind).toBe("due_tomorrow");
  });

  it("builds stable dedupe keys", () => {
    const reminders = buildReminderCandidates({
      userId: "u1",
      nowIso: "2026-02-28T10:00:00.000Z",
      items: [
        {
          sourceType: "calendar_event",
          sourceId: "evt-1",
          title: "Task",
          dueDate: "2026-02-28",
          navigateTo: "/calendar",
        },
      ],
    });

    expect(reminders[0].dedupeKey).toBe("u1:calendar_event:evt-1:due_today:2026-02-28");
  });
});
