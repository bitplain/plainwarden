import type { InboxConvertedEntityType } from "@/lib/types";

export async function refreshAuthoritativeDataAfterInboxConvert(
  target: InboxConvertedEntityType,
  handlers: {
    refreshEvents: () => Promise<void>;
    refreshNotes: () => Promise<void>;
  },
): Promise<void> {
  if (target === "event") {
    await handlers.refreshEvents();
    return;
  }

  if (target === "note") {
    await handlers.refreshNotes();
  }
}
