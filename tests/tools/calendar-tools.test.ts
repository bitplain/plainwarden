import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeTool } from "@/tools";
import {
  createEventForUser,
  listEventsByUser,
  updateEventForUser,
} from "@/lib/server/json-db";

vi.mock("@/lib/server/json-db", () => ({
  createEventForUser: vi.fn(),
  deleteEventForUser: vi.fn(),
  listEventsByUser: vi.fn(),
  updateEventForUser: vi.fn(),
}));

const NOW_ISO = "2026-02-28T10:00:00.000Z";
const TOOL_CTX = { userId: "user-1", nowIso: NOW_ISO };

const MOCK_EVENT = {
  id: "evt-1",
  title: "Встреча",
  description: "",
  date: "2026-03-01",
  time: undefined,
  type: "task" as const,
  status: "pending" as const,
  recurrenceException: false,
  revision: 0,
};

const mockCreateEventForUser = vi.mocked(createEventForUser);
const mockListEventsByUser = vi.mocked(listEventsByUser);
const mockUpdateEventForUser = vi.mocked(updateEventForUser);

describe("calendar tools date normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateEventForUser.mockResolvedValue(MOCK_EVENT);
    mockListEventsByUser.mockResolvedValue([]);
    mockUpdateEventForUser.mockResolvedValue(MOCK_EVENT);
  });

  it("normalizes 'tomorrow' when creating event", async () => {
    const result = await executeTool(
      "calendar_create_event",
      { title: "Планирование", date: "tomorrow" },
      TOOL_CTX,
    );

    expect(result.ok).toBe(true);
    expect(mockCreateEventForUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        date: "2026-03-01",
      }),
    );
  });

  it("normalizes russian relative dates when creating event", async () => {
    await executeTool(
      "calendar_create_event",
      { title: "Планирование", date: "завтра" },
      TOOL_CTX,
    );

    expect(mockCreateEventForUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        date: "2026-03-01",
      }),
    );

    await executeTool(
      "calendar_create_event",
      { title: "Планирование", date: "послезавтра" },
      TOOL_CTX,
    );

    expect(mockCreateEventForUser).toHaveBeenLastCalledWith(
      "user-1",
      expect.objectContaining({
        date: "2026-03-02",
      }),
    );
  });

  it("normalizes list filters for relative dates", async () => {
    const result = await executeTool(
      "calendar_list_events",
      { dateFrom: "завтра", dateTo: "послезавтра" },
      TOOL_CTX,
    );

    expect(result.ok).toBe(true);
    expect(mockListEventsByUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        dateFrom: "2026-03-01",
        dateTo: "2026-03-02",
      }),
    );
  });

  it("normalizes update payload date for relative keywords", async () => {
    const result = await executeTool(
      "calendar_update_event",
      { eventId: "evt-1", date: "сегодня" },
      TOOL_CTX,
    );

    expect(result.ok).toBe(true);
    expect(mockUpdateEventForUser).toHaveBeenCalledWith(
      "user-1",
      "evt-1",
      expect.objectContaining({
        date: "2026-02-28",
      }),
      expect.any(Object),
    );
  });

  it("rejects unsupported date value and does not create event", async () => {
    const result = await executeTool(
      "calendar_create_event",
      { title: "Встреча", date: "когда-нибудь" },
      TOOL_CTX,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("date must be");
    expect(mockCreateEventForUser).not.toHaveBeenCalled();
  });
});
