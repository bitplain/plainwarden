import { describe, expect, it, vi } from "vitest";
import { refreshAuthoritativeDataAfterInboxConvert } from "@/components/calendar2/inbox-convert-sync";

describe("refreshAuthoritativeDataAfterInboxConvert", () => {
  it("refreshes events after event conversion", async () => {
    const refreshEvents = vi.fn(async () => undefined);
    const refreshNotes = vi.fn(async () => undefined);

    await refreshAuthoritativeDataAfterInboxConvert("event", {
      refreshEvents,
      refreshNotes,
    });

    expect(refreshEvents).toHaveBeenCalledOnce();
    expect(refreshNotes).not.toHaveBeenCalled();
  });

  it("refreshes notes after note conversion", async () => {
    const refreshEvents = vi.fn(async () => undefined);
    const refreshNotes = vi.fn(async () => undefined);

    await refreshAuthoritativeDataAfterInboxConvert("note", {
      refreshEvents,
      refreshNotes,
    });

    expect(refreshNotes).toHaveBeenCalledOnce();
    expect(refreshEvents).not.toHaveBeenCalled();
  });

  it("does not refresh unrelated stores after task conversion", async () => {
    const refreshEvents = vi.fn(async () => undefined);
    const refreshNotes = vi.fn(async () => undefined);

    await refreshAuthoritativeDataAfterInboxConvert("task", {
      refreshEvents,
      refreshNotes,
    });

    expect(refreshEvents).not.toHaveBeenCalled();
    expect(refreshNotes).not.toHaveBeenCalled();
  });
});
