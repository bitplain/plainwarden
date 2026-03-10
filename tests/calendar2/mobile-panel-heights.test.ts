import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import path from "node:path";

const ROOT = "/Users/kaiot/Documents/plainwarden";
const PANEL_FILES = [
  "src/components/calendar2/Calendar2MonthView.tsx",
  "src/components/calendar2/Calendar2WeekView.tsx",
  "src/components/calendar2/Calendar2DayView.tsx",
  "src/components/calendar2/KanbanBoard.tsx",
  "src/components/calendar2/NotesPanel.tsx",
];

describe("calendar2 mobile panel heights", () => {
  it("uses the shared responsive frame helper instead of hard-coding h-full in mobile panels", () => {
    for (const file of PANEL_FILES) {
      const source = readFileSync(path.join(ROOT, file), "utf8");

      expect(source, file).toContain("CALENDAR2_RESPONSIVE_PANEL_FRAME_CLASSNAME");
      expect(source, file).not.toContain(
        'className="flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)]"',
      );
    }
  });

  it("keeps the shared panel frame fixed-height only from xl upwards", () => {
    const source = readFileSync(
      path.join(ROOT, "src/components/calendar2/mobile-layout.ts"),
      "utf8",
    );

    expect(source).toContain("CALENDAR2_RESPONSIVE_PANEL_FRAME_CLASSNAME");
    expect(source).toContain("flex min-h-0 flex-col overflow-hidden");
    expect(source).toContain("xl:h-full");
    expect(source).not.toContain("lg:h-full");
  });
});
