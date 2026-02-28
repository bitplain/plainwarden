import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EventModal2 from "@/components/calendar2/EventModal2";
import type { CalendarEvent } from "@/lib/types";

const BASE_EVENT: CalendarEvent = {
  id: "evt-1",
  title: "Поставить задачу",
  description: "Чтобы я завтра пришел из магазина",
  date: "2026-03-01",
  time: "10:00",
  type: "task",
  status: "pending",
  recurrenceException: false,
  revision: 0,
};

describe("EventModal2 view description layout", () => {
  it("renders description as dedicated body section in view mode", () => {
    const html = renderToStaticMarkup(
      React.createElement(EventModal2, {
        mode: "view",
        event: BASE_EVENT,
        onClose: () => undefined,
        eventPriorities: {},
      }),
    );

    expect(html).toContain("Описание");
    expect(html).toContain(BASE_EVENT.description);
  });
});
