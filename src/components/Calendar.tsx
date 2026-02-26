"use client";

import { startOfDay } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import EventModal from "@/components/EventModal";
import CalendarSidebar from "@/components/calendar/CalendarSidebar";
import CalendarToolbar from "@/components/calendar/CalendarToolbar";
import DayView from "@/components/calendar/DayView";
import MonthView from "@/components/calendar/MonthView";
import WeekView from "@/components/calendar/WeekView";
import type {
  CalendarFilter,
  CalendarView,
  SidebarCategory,
  UpcomingEvent,
} from "@/components/calendar/calendar-types";
import {
  buildEventsByDate,
  formatPeriodLabel,
  getMonthGridDates,
  getWeekDates,
  normalizeToDay,
  parseEventDateTime,
  shiftAnchorDate,
  sortEventsByDateTime,
  toDateKey,
} from "@/components/calendar/date-utils";
import { useNetdenStore } from "@/lib/store";
import { CalendarEvent, CreateEventInput, EventStatus } from "@/lib/types";

export type CalendarVariant = "standalone" | "embedded";

interface CalendarProps {
  variant?: CalendarVariant;
  onBackToConsole?: () => void;
}

function matchesFilter(event: CalendarEvent, filter: CalendarFilter): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "event" || filter === "task") {
    return event.type === filter;
  }

  const status = event.status ?? "pending";
  return status === filter;
}

function buildCategories(totalEvents: CalendarEvent[]): SidebarCategory[] {
  const doneCount = totalEvents.filter((event) => event.status === "done").length;
  const pendingCount = totalEvents.filter((event) => (event.status ?? "pending") === "pending").length;

  return [
    { id: "all", label: "Все", count: totalEvents.length, tone: "neutral" },
    {
      id: "event",
      label: "События",
      count: totalEvents.filter((event) => event.type === "event").length,
      tone: "sky",
    },
    {
      id: "task",
      label: "Задачи",
      count: totalEvents.filter((event) => event.type === "task").length,
      tone: "violet",
    },
    { id: "pending", label: "В работе", count: pendingCount, tone: "amber" },
    { id: "done", label: "Выполнено", count: doneCount, tone: "emerald" },
  ];
}

function buildUpcomingEvents(totalEvents: CalendarEvent[]): UpcomingEvent[] {
  const todayStart = startOfDay(new Date());

  return totalEvents
    .map((event) => ({ event, startsAt: parseEventDateTime(event) }))
    .filter((item) => !Number.isNaN(item.startsAt.getTime()) && item.startsAt >= todayStart)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .slice(0, 6);
}

export default function Calendar({ variant = "standalone", onBackToConsole }: CalendarProps) {
  const isEmbedded = variant === "embedded";
  const [view, setView] = useState<CalendarView>("month");
  const [anchorDate, setAnchorDate] = useState<Date>(() => startOfDay(new Date()));
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  const user = useNetdenStore((state) => state.user);
  const events = useNetdenStore((state) => state.events);
  const error = useNetdenStore((state) => state.error);
  const isAuthLoading = useNetdenStore((state) => state.isAuthLoading);
  const isEventsLoading = useNetdenStore((state) => state.isEventsLoading);

  const bootstrapAuth = useNetdenStore((state) => state.bootstrapAuth);
  const fetchEvents = useNetdenStore((state) => state.fetchEvents);
  const addEvent = useNetdenStore((state) => state.addEvent);
  const updateEvent = useNetdenStore((state) => state.updateEvent);
  const deleteEvent = useNetdenStore((state) => state.deleteEvent);
  const logout = useNetdenStore((state) => state.logout);

  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);

  useEffect(() => {
    if (user) {
      void fetchEvents();
    }
  }, [user, fetchEvents]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const apply = () => {
      const isMobile = media.matches;
      setIsMobileLayout(isMobile);
      if (!isMobile) {
        setIsSidebarVisible(false);
      }
    };
    apply();

    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const allEventsSorted = useMemo(() => sortEventsByDateTime(events), [events]);

  const filteredEvents = useMemo(
    () => allEventsSorted.filter((event) => matchesFilter(event, filter)),
    [allEventsSorted, filter],
  );

  const allEventsByDate = useMemo(() => buildEventsByDate(allEventsSorted), [allEventsSorted]);
  const filteredEventsByDate = useMemo(() => buildEventsByDate(filteredEvents), [filteredEvents]);

  const monthGridDays = useMemo(() => getMonthGridDates(anchorDate), [anchorDate]);
  const weekDates = useMemo(() => getWeekDates(anchorDate), [anchorDate]);
  const dayEvents = useMemo(
    () => filteredEventsByDate[toDateKey(anchorDate)] ?? [],
    [filteredEventsByDate, anchorDate],
  );

  const categories = useMemo(() => buildCategories(events), [events]);
  const upcoming = useMemo(() => buildUpcomingEvents(events), [events]);

  const periodLabel = useMemo(() => formatPeriodLabel(anchorDate, view), [anchorDate, view]);

  const handleSaveEvent = async (input: CreateEventInput) => {
    await addEvent(input);
  };

  const handleDeleteEvent = async (eventId: string) => {
    await deleteEvent(eventId);
    setSelectedEventId(null);
  };

  const handleToggleStatus = async (eventId: string, nextStatus: EventStatus) => {
    await updateEvent({ id: eventId, status: nextStatus });
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const handlePrev = () => {
    setAnchorDate((prev) => normalizeToDay(shiftAnchorDate(prev, view, "prev")));
  };

  const handleNext = () => {
    setAnchorDate((prev) => normalizeToDay(shiftAnchorDate(prev, view, "next")));
  };

  const handleToday = () => {
    setAnchorDate(startOfDay(new Date()));
  };

  const handleSelectDate = (date: Date) => {
    setAnchorDate(normalizeToDay(date));
    if (isMobileLayout) {
      setIsSidebarVisible(false);
    }
  };

  const handleFilterChange = (nextFilter: CalendarFilter) => {
    setFilter(nextFilter);
    if (isMobileLayout) {
      setIsSidebarVisible(false);
    }
  };

  const layoutClass = isEmbedded
    ? "grid h-full w-full grid-cols-1 gap-0 lg:grid-cols-[320px_1fr]"
    : "mx-auto grid h-full w-full max-w-[1480px] grid-cols-1 gap-0 px-2 pb-2 pt-2 sm:px-4 sm:pb-4 sm:pt-3 lg:grid-cols-[300px_1fr] xl:px-8";

  return (
    <div
      className={`calendar-page calendar-surface flex ${
        isEmbedded
          ? "h-full min-h-0 bg-black/65 font-[family-name:var(--font-geist-mono)]"
          : "h-dvh font-[family-name:var(--font-geist-sans)]"
      } flex-col bg-[var(--background)] text-[var(--foreground)]`}
    >
      <CalendarToolbar
        currentView={view}
        periodLabel={periodLabel}
        onViewChange={setView}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onAdd={() => setShowAddModal(true)}
        onLogout={handleLogout}
        showTerminalLink={!isEmbedded}
        showLogout={!isEmbedded}
        showBackToConsole={isEmbedded && Boolean(onBackToConsole)}
        onBackToConsole={onBackToConsole}
        onToggleSidebar={() => setIsSidebarVisible((prev) => !prev)}
        isSidebarVisible={isSidebarVisible}
      />

      <div className={`min-h-0 flex-1 overflow-hidden ${isEmbedded ? "calendar-embedded-body" : ""}`}>
        <div className={layoutClass}>
          <div className={`${isSidebarVisible ? "block" : "hidden"} min-h-0 lg:block`}>
            <CalendarSidebar
              anchorDate={anchorDate}
              eventsByDate={allEventsByDate}
              categories={categories}
              activeFilter={filter}
              upcoming={upcoming}
              onSelectDate={handleSelectDate}
              onFilterChange={handleFilterChange}
            />
          </div>

          <main
            className={`${
              isSidebarVisible ? "hidden lg:flex" : "flex"
            } min-h-0 flex-col gap-2 border border-white/10 bg-black/45 p-2 sm:p-3 lg:border-l-0 ${
              isEmbedded ? "rounded-none" : "rounded-sm lg:rounded-l-none"
            }`}
          >
            {(isAuthLoading || isEventsLoading) && (
              <div className="rounded-md border border-white/12 bg-white/[0.03] px-3 py-2 text-xs text-zinc-400">
                Синхронизация данных...
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}

            <div className="min-h-0 flex-1">
              {view === "month" && (
                <MonthView
                  anchorDate={anchorDate}
                  days={monthGridDays}
                  eventsByDate={filteredEventsByDate}
                  onSelectDate={handleSelectDate}
                  onSelectEvent={setSelectedEventId}
                />
              )}

              {view === "week" && (
                <WeekView
                  weekDates={weekDates}
                  anchorDate={anchorDate}
                  eventsByDate={filteredEventsByDate}
                  onSelectDate={handleSelectDate}
                  onSelectEvent={setSelectedEventId}
                />
              )}

              {view === "day" && (
                <DayView dayDate={anchorDate} dayEvents={dayEvents} onSelectEvent={setSelectedEventId} />
              )}
            </div>
          </main>
        </div>
      </div>

      {!isEmbedded && (
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-4 right-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-sky-300/45 bg-sky-500 text-xl font-semibold text-zinc-950 shadow-[0_18px_42px_-24px_rgba(56,189,248,0.95)] md:hidden"
          aria-label="Добавить событие"
        >
          +
        </button>
      )}

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          mode="view"
          onClose={() => setSelectedEventId(null)}
          onDelete={handleDeleteEvent}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {showAddModal && (
        <EventModal mode="add" onClose={() => setShowAddModal(false)} onSave={handleSaveEvent} />
      )}
    </div>
  );
}
