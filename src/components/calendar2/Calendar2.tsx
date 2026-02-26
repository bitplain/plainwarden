"use client";

import { startOfDay } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNetdenStore } from "@/lib/store";
import type { CalendarEvent, CreateEventInput, EventStatus } from "@/lib/types";
import {
  buildEventsByDate,
  formatPeriodLabel,
  getMonthGridDates,
  getWeekDates,
  normalizeToDay,
  shiftAnchorDate,
  sortEventsByDateTime,
  toDateKey,
} from "@/components/calendar/date-utils";
import type {
  Calendar2Tab,
  Calendar2View,
  SidebarCategory,
  TaskPriority,
} from "./calendar2-types";
import { useCalendar2Store } from "./calendar2-store";
import Calendar2Toolbar from "./Calendar2Toolbar";
import Calendar2Sidebar from "./Calendar2Sidebar";
import Calendar2MonthView from "./Calendar2MonthView";
import Calendar2WeekView from "./Calendar2WeekView";
import Calendar2DayView from "./Calendar2DayView";
import DailyPlanner from "./DailyPlanner";
import KanbanBoard from "./KanbanBoard";
import NotesPanel from "./NotesPanel";
import EventModal2 from "./EventModal2";

type CalendarFilter = "all" | "event" | "task" | "pending" | "done";

function matchesFilter(event: CalendarEvent, filter: CalendarFilter): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "event" || filter === "task") {
    return event.type === filter;
  }
  return (event.status ?? "pending") === filter;
}

function buildCategories(events: CalendarEvent[]): SidebarCategory[] {
  return [
    { id: "all", label: "Все", count: events.length, tone: "neutral" },
    {
      id: "event",
      label: "События",
      count: events.filter((e) => e.type === "event").length,
      tone: "indigo",
    },
    {
      id: "task",
      label: "Задачи",
      count: events.filter((e) => e.type === "task").length,
      tone: "violet",
    },
    {
      id: "pending",
      label: "В работе",
      count: events.filter((e) => (e.status ?? "pending") === "pending").length,
      tone: "amber",
    },
    {
      id: "done",
      label: "Выполнено",
      count: events.filter((e) => e.status === "done").length,
      tone: "emerald",
    },
  ];
}

const PRIORITIES_STORAGE_KEY = "calendar2-event-priorities";

function loadPriorities(): Record<string, TaskPriority> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = localStorage.getItem(PRIORITIES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, TaskPriority>) : {};
  } catch {
    return {};
  }
}

function savePriorities(priorities: Record<string, TaskPriority>): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(PRIORITIES_STORAGE_KEY, JSON.stringify(priorities));
  } catch {
    // Ignore storage errors
  }
}

export default function Calendar2() {
  const [activeTab, setActiveTab] = useState<Calendar2Tab>("calendar");
  const [view, setView] = useState<Calendar2View>("month");
  const [anchorDate, setAnchorDate] = useState<Date>(() => startOfDay(new Date()));
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalDate, setAddModalDate] = useState<string | undefined>(undefined);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [eventPriorities, setEventPriorities] = useState<Record<string, TaskPriority>>(loadPriorities);

  // Global store
  const user = useNetdenStore((s) => s.user);
  const events = useNetdenStore((s) => s.events);
  const error = useNetdenStore((s) => s.error);
  const isAuthLoading = useNetdenStore((s) => s.isAuthLoading);
  const isEventsLoading = useNetdenStore((s) => s.isEventsLoading);
  const bootstrapAuth = useNetdenStore((s) => s.bootstrapAuth);
  const fetchEvents = useNetdenStore((s) => s.fetchEvents);
  const addEvent = useNetdenStore((s) => s.addEvent);
  const updateEvent = useNetdenStore((s) => s.updateEvent);
  const deleteEvent = useNetdenStore((s) => s.deleteEvent);
  const logout = useNetdenStore((s) => s.logout);

  // Local store for kanban, notes, time blocks
  const localStore = useCalendar2Store();

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
      const mobile = media.matches;
      setIsMobileLayout(mobile);
      if (!mobile) {
        setIsSidebarVisible(false);
      }
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const handlePriorityChange = useCallback(
    (eventId: string, priority: TaskPriority) => {
      setEventPriorities((prev) => {
        const next = { ...prev, [eventId]: priority };
        savePriorities(next);
        return next;
      });
    },
    [],
  );

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const allSorted = useMemo(() => sortEventsByDateTime(events), [events]);

  const filtered = useMemo(
    () => allSorted.filter((e) => matchesFilter(e, filter)),
    [allSorted, filter],
  );

  const allEventsByDate = useMemo(() => buildEventsByDate(allSorted), [allSorted]);
  const filteredEventsByDate = useMemo(() => buildEventsByDate(filtered), [filtered]);

  const monthGridDays = useMemo(() => getMonthGridDates(anchorDate), [anchorDate]);
  const weekDates = useMemo(() => getWeekDates(anchorDate), [anchorDate]);
  const dayEvents = useMemo(
    () => filteredEventsByDate[toDateKey(anchorDate)] ?? [],
    [filteredEventsByDate, anchorDate],
  );

  const categories = useMemo(() => buildCategories(events), [events]);
  const periodLabel = useMemo(
    () => formatPeriodLabel(anchorDate, view),
    [anchorDate, view],
  );

  // Build resolved priorities map: checks event ID first, then falls back to title::date key
  const resolvedPriorities = useMemo(() => {
    const resolved: Record<string, TaskPriority> = { ...eventPriorities };
    for (const event of events) {
      if (!resolved[event.id]) {
        const fallbackKey = `${event.title}::${event.date}`;
        if (eventPriorities[fallbackKey]) {
          resolved[event.id] = eventPriorities[fallbackKey];
        }
      }
    }
    return resolved;
  }, [events, eventPriorities]);

  const handleSaveEvent = async (input: CreateEventInput, priority: TaskPriority) => {
    await addEvent(input);
    // Store priority keyed by title::date as a secondary lookup
    // until we can associate it with the server-assigned event ID
    handlePriorityChange(`${input.title}::${input.date}`, priority);
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

  const handleQuickAdd = (date: Date) => {
    setAddModalDate(toDateKey(date));
    setShowAddModal(true);
  };

  const handleFilterChange = (nextFilter: string) => {
    setFilter(nextFilter as CalendarFilter);
    if (isMobileLayout) {
      setIsSidebarVisible(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "calendar":
        return (
          <div className="min-h-0 flex-1">
            {view === "month" && (
              <Calendar2MonthView
                anchorDate={anchorDate}
                days={monthGridDays}
                eventsByDate={filteredEventsByDate}
                eventPriorities={resolvedPriorities}
                onSelectDate={handleSelectDate}
                onSelectEvent={setSelectedEventId}
                onQuickAdd={handleQuickAdd}
              />
            )}
            {view === "week" && (
              <Calendar2WeekView
                weekDates={weekDates}
                anchorDate={anchorDate}
                eventsByDate={filteredEventsByDate}
                eventPriorities={resolvedPriorities}
                onSelectDate={handleSelectDate}
                onSelectEvent={setSelectedEventId}
                onQuickAdd={handleQuickAdd}
              />
            )}
            {view === "day" && (
              <Calendar2DayView
                dayDate={anchorDate}
                dayEvents={dayEvents}
                eventPriorities={resolvedPriorities}
                onSelectEvent={setSelectedEventId}
              />
            )}
          </div>
        );
      case "planner":
        return (
          <div className="min-h-0 flex-1">
            <DailyPlanner
              anchorDate={anchorDate}
              events={allSorted}
              timeBlocks={localStore.timeBlocks}
              onAddTimeBlock={localStore.addTimeBlock}
              onDeleteTimeBlock={localStore.deleteTimeBlock}
              onSelectEvent={setSelectedEventId}
            />
          </div>
        );
      case "kanban":
        return (
          <div className="min-h-0 flex-1">
            <KanbanBoard
              cards={localStore.kanbanCards}
              events={events}
              onAddCard={localStore.addKanbanCard}
              onMoveCard={localStore.moveKanbanCard}
              onDeleteCard={localStore.deleteKanbanCard}
            />
          </div>
        );
      case "notes":
        return (
          <div className="min-h-0 flex-1">
            <NotesPanel
              notes={localStore.notes}
              events={events}
              anchorDate={anchorDate}
              onAddNote={localStore.addNote}
              onUpdateNote={localStore.updateNote}
              onDeleteNote={localStore.deleteNote}
            />
          </div>
        );
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-[#0a0a14] font-[family-name:var(--font-geist-sans)] text-[var(--foreground)]">
      <Calendar2Toolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentView={view}
        periodLabel={periodLabel}
        onViewChange={setView}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onAdd={() => {
          setAddModalDate(undefined);
          setShowAddModal(true);
        }}
        onLogout={handleLogout}
        onToggleSidebar={() => setIsSidebarVisible((prev) => !prev)}
        isSidebarVisible={isSidebarVisible}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto grid h-full w-full max-w-[1480px] grid-cols-1 gap-0 px-2 pb-2 pt-2 sm:px-4 sm:pb-4 sm:pt-3 lg:grid-cols-[280px_1fr] xl:px-8">
          {/* Sidebar */}
          <div className={`${isSidebarVisible ? "block" : "hidden"} min-h-0 lg:block`}>
            <Calendar2Sidebar
              anchorDate={anchorDate}
              eventsByDate={allEventsByDate}
              categories={categories}
              activeFilter={filter}
              onSelectDate={handleSelectDate}
              onFilterChange={handleFilterChange}
              notes={localStore.notes}
              activeTab={activeTab}
            />
          </div>

          {/* Main content */}
          <main
            className={`${
              isSidebarVisible ? "hidden lg:flex" : "flex"
            } min-h-0 flex-col gap-2 border border-white/[0.06] bg-[#0f0f1a]/60 p-2 sm:p-3 lg:border-l-0 rounded-sm lg:rounded-l-none`}
          >
            {(isAuthLoading || isEventsLoading) && (
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-zinc-500">
                Синхронизация данных...
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}

            {renderContent()}
          </main>
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        type="button"
        onClick={() => {
          setAddModalDate(undefined);
          setShowAddModal(true);
        }}
        className="fixed bottom-4 right-4 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full border border-indigo-400/40 bg-indigo-500 text-xl font-semibold text-white shadow-[0_16px_40px_-20px_rgba(99,102,241,0.9)] md:hidden"
        aria-label="Добавить"
      >
        +
      </button>

      {/* Event view modal */}
      {selectedEvent && (
        <EventModal2
          event={selectedEvent}
          mode="view"
          eventPriorities={resolvedPriorities}
          onClose={() => setSelectedEventId(null)}
          onDelete={handleDeleteEvent}
          onToggleStatus={handleToggleStatus}
          onPriorityChange={handlePriorityChange}
        />
      )}

      {/* Add event modal */}
      {showAddModal && (
        <EventModal2
          mode="add"
          initialDate={addModalDate}
          eventPriorities={resolvedPriorities}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveEvent}
        />
      )}
    </div>
  );
}
