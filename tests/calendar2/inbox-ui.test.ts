import { describe, expect, it } from "vitest";
import type { InboxItem } from "@/lib/types";
import {
  buildInboxAiPrefillForTarget,
  getInboxItemActionState,
  resolveInboxCaptureShortcut,
} from "@/components/calendar2/inbox-ui";

const BASE_ITEM: InboxItem = {
  id: "inbox-1",
  userId: "user-1",
  content: "Разобрать идею для статьи",
  typeHint: "idea",
  status: "new",
  createdAt: "2026-03-08T08:00:00.000Z",
  updatedAt: "2026-03-08T08:00:00.000Z",
};

describe("inbox quick capture shortcuts", () => {
  it("focuses inline capture inside inbox for slash shortcut", () => {
    expect(
      resolveInboxCaptureShortcut({
        activeTab: "inbox",
        key: "/",
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        isTypingTarget: false,
      }),
    ).toBe("focus-inline");
  });

  it("opens modal outside inbox for legacy capture shortcut", () => {
    expect(
      resolveInboxCaptureShortcut({
        activeTab: "calendar",
        key: "I",
        ctrlKey: true,
        metaKey: false,
        shiftKey: true,
        isTypingTarget: false,
      }),
    ).toBe("open-modal");
  });

  it("ignores shortcut while focus is already in a typing control", () => {
    expect(
      resolveInboxCaptureShortcut({
        activeTab: "inbox",
        key: "/",
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        isTypingTarget: true,
      }),
    ).toBe("none");
  });
});

describe("inbox item action availability", () => {
  it("keeps primary actions available for new items", () => {
    expect(getInboxItemActionState(BASE_ITEM)).toEqual({
      canConvertToTask: true,
      canConvertToEvent: true,
      canConvertToNote: true,
      canArchive: true,
      isPending: false,
      isTerminalState: false,
      statusLabel: "Новый",
    });
  });

  it("locks conversion once item is already processed", () => {
    expect(
      getInboxItemActionState({
        ...BASE_ITEM,
        status: "processed",
        convertedToEntityType: "task",
        convertedToEntityId: "task-1",
        processedAt: "2026-03-08T08:30:00.000Z",
      }),
    ).toEqual({
      canConvertToTask: false,
      canConvertToEvent: false,
      canConvertToNote: false,
      canArchive: true,
      isPending: false,
      isTerminalState: false,
      statusLabel: "Обработан",
    });
  });

  it("disables every action while an item request is pending", () => {
    expect(
      getInboxItemActionState(BASE_ITEM, {
        itemId: "inbox-1",
        action: "event",
      }),
    ).toEqual({
      canConvertToTask: false,
      canConvertToEvent: false,
      canConvertToNote: false,
      canArchive: false,
      isPending: true,
      isTerminalState: false,
      statusLabel: "Новый",
    });
  });
});

describe("inbox ai prefill", () => {
  it("uses suggested task fields only for the recommended task target", () => {
    expect(
      buildInboxAiPrefillForTarget("task", {
        itemId: "inbox-1",
        summary: "Это задача на конкретный день.",
        recommendedTarget: "task",
        rationale: ["Есть действие."],
        suggestedDueDate: "2026-03-10",
        suggestedPriority: true,
      }),
    ).toEqual({
      dueDate: "2026-03-10",
      isPriority: true,
    });
  });

  it("uses suggested date only for the recommended event target", () => {
    expect(
      buildInboxAiPrefillForTarget("event", {
        itemId: "inbox-1",
        summary: "Это событие с датой.",
        recommendedTarget: "event",
        rationale: ["Есть временная привязка."],
        suggestedDate: "2026-03-12",
      }),
    ).toEqual({
      date: "2026-03-12",
    });
  });

  it("does not prefill when user chooses a different target", () => {
    expect(
      buildInboxAiPrefillForTarget("note", {
        itemId: "inbox-1",
        summary: "Лучше сделать задачей.",
        recommendedTarget: "task",
        rationale: ["Есть действие."],
        suggestedDueDate: "2026-03-10",
        suggestedPriority: true,
      }),
    ).toEqual({});
  });
});
