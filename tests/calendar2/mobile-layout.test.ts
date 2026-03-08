import { describe, expect, it } from "vitest";
import {
  CALENDAR2_MOBILE_SCROLL_SHELL_CLASSNAME,
  INBOX_LIST_SCROLL_CLASSNAME,
} from "@/components/calendar2/mobile-layout";

describe("calendar2 mobile layout guards", () => {
  it("keeps the shell scrollable until the wide desktop inbox layout", () => {
    expect(CALENDAR2_MOBILE_SCROLL_SHELL_CLASSNAME).toContain("overflow-y-auto");
    expect(CALENDAR2_MOBILE_SCROLL_SHELL_CLASSNAME).toContain("overflow-x-hidden");
    expect(CALENDAR2_MOBILE_SCROLL_SHELL_CLASSNAME).toContain("xl:overflow-hidden");
    expect(CALENDAR2_MOBILE_SCROLL_SHELL_CLASSNAME).not.toContain("lg:overflow-hidden");
    expect(CALENDAR2_MOBILE_SCROLL_SHELL_CLASSNAME).toContain(
      "pb-[calc(7rem+env(safe-area-inset-bottom))]",
    );
  });

  it("keeps inbox list scrolling only on desktop-sized layouts", () => {
    expect(INBOX_LIST_SCROLL_CLASSNAME).toContain("xl:max-h-[calc(100dvh-24rem)]");
    expect(INBOX_LIST_SCROLL_CLASSNAME).toContain("xl:overflow-y-auto");
    expect(INBOX_LIST_SCROLL_CLASSNAME).toContain("xl:pr-1");
    expect(INBOX_LIST_SCROLL_CLASSNAME).not.toMatch(
      /(^|\s)max-h-\[calc\(100dvh-24rem\)\](?=\s|$)/,
    );
  });
});
