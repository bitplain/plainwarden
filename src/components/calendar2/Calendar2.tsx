"use client";

import { startOfDay } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNetdenStore } from "@/lib/store";
import type {
  CalendarEvent,
  CreateEventInput,
  EventStatus,
  RecurrenceScope,
} from "@/lib/types";
import {
  buildEventsByDate,
  formatPeriodLabel,
  getMonthGridDates,
  getWeekDates,
  normalizeToDay,
  shiftAnchorDate,
  sortEventsByDateTime,
  toDateKey,
} from "@/components/calendar2/date-utils";
import type { SidebarCategory, TaskPriority } from "./calendar2-types";
import {
  buildCalendar2EventFilters,
  type Calendar2CategoryFilter,
} from "./calendar2-query-filters";
import { useCalendar2UrlStore } from "./calendar2-url-store";
import { useCalendar2Store } from "./calendar2-store";
import Calendar2Toolbar from "./Calendar2Toolbar";
import Calendar2Sidebar from "./Calendar2Sidebar";
import Calendar2MonthView from "./Calendar2MonthView";
import Calendar2WeekView from "./Calendar2WeekView";
import Calendar2DayView from "./Calendar2DayView";
import KanbanBoard from "./KanbanBoard";
import NotesPanel from "./NotesPanel";
import Calendar2AiPanel from "./Calendar2AiPanel";
import InboxPanel from "./InboxPanel";
import EventModal2 from "./EventModal2";
import MoveTimePickerDialog, { type MoveTimePickerRequest, type MoveTimePickerResult } from "./MoveTimePickerDialog";
import QuickCaptureDialog from "./QuickCaptureDialog";
import { CALENDAR2_LINEAR_VARS } from "./calendar2-theme";
import { useInboxTasks } from "./useInboxTasks";
import { usePreciseReminderTick } from "./usePreciseReminderTick";
import {
  readUiPreferences,
  resolveDesktopSidebarInitialState,
  saveRememberedDesktopSidebarState,
  subscribeUiPreferences,
  type UiPreferences,
} from "@/components/settings/settings-ui-preferences";

type EventMovePayload = { date: string; time?: string };
const EMPTY_DAY_EVENTS: CalendarEvent[] = [];

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

function toDayStart(dateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return startOfDay(new Date());
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return startOfDay(new Date());
  }

  return startOfDay(date);
}

export default function Calendar2() {
  const { state: urlState, setState: setUrlState } = useCalendar2UrlStore();
  const activeTab = urlState.tab;
  const view = urlState.view;
  const categoryFilter = urlState.category;
  const searchQuery = urlState.q;
  const anchorDate = useMemo(() => toDayStart(urlState.date), [urlState.date]);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [addModalDate, setAddModalDate] = useState<string | undefined>(undefined);
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(() => readUiPreferences());
  const [isSidebarVisible, setIsSidebarVisible] = useState(() =>
    resolveDesktopSidebarInitialState(readUiPreferences()),
  );
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [eventPriorities, setEventPriorities] = useState<Record<string, TaskPriority>>(loadPriorities);
  const [movePickerRequest, setMovePickerRequest] = useState<MoveTimePickerRequest | null>(null);
  const [glowingCellKey, setGlowingCellKey] = useState<string | null>(null);
  const dropFlashTimeoutRef = useRef<number | null>(null);

  // Global store
  const user = useNetdenStore((s) => s.user);
  const isAuthenticated = useNetdenStore((s) => s.isAuthenticated);
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
  const syncTaskEventsToKanban = localStore.syncTaskEventsToKanban;
  const inboxTasks = useInboxTasks(toDateKey(anchorDate));

  usePreciseReminderTick({
    events,
    user,
    isAuthenticated,
    addNotification: localStore.addNotification,
  });

  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const calendarQueryFilters = useMemo(
    () =>
      buildCalendar2EventFilters({
        q: debouncedSearchQuery,
        category: categoryFilter,
      }),
    [debouncedSearchQuery, categoryFilter],
  );
  const liveCalendarQueryFilters = useMemo(
    () =>
      buildCalendar2EventFilters({
        q: searchQuery.trim(),
        category: categoryFilter,
      }),
    [searchQuery, categoryFilter],
  );
  const hasActiveCalendarFilters = useMemo(
    () => Boolean(debouncedSearchQuery || categoryFilter !== "all"),
    [debouncedSearchQuery, categoryFilter],
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    void fetchEvents(calendarQueryFilters);
  }, [user, fetchEvents, calendarQueryFilters]);

  useEffect(() => subscribeUiPreferences(setUiPreferences), []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const apply = () => {
      const mobile = media.matches;
      setIsMobileLayout(mobile);
      setIsSidebarVisible(
        mobile ? false : resolveDesktopSidebarInitialState(uiPreferences),
      );
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [uiPreferences]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingTarget =
        tag === "input" || tag === "textarea" || target?.isContentEditable;

      if (isTypingTarget) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "i") {
        event.preventDefault();
        setShowQuickCapture(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const clearDragOverTargets = () => {
      const activeTargets = document.querySelectorAll<HTMLElement>(
        ".cal2-drop-target[data-drag-over]",
      );
      for (const target of activeTargets) {
        target.removeAttribute("data-drag-over");
      }
    };

    window.addEventListener("dragend", clearDragOverTargets);
    window.addEventListener("drop", clearDragOverTargets);
    window.addEventListener("blur", clearDragOverTargets);

    return () => {
      window.removeEventListener("dragend", clearDragOverTargets);
      window.removeEventListener("drop", clearDragOverTargets);
      window.removeEventListener("blur", clearDragOverTargets);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (dropFlashTimeoutRef.current !== null) {
        window.clearTimeout(dropFlashTimeoutRef.current);
      }
    };
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

  const triggerDropFlash = useCallback((cellKey: string) => {
    if (dropFlashTimeoutRef.current !== null) {
      window.clearTimeout(dropFlashTimeoutRef.current);
    }
    setGlowingCellKey(cellKey);
    dropFlashTimeoutRef.current = window.setTimeout(() => {
      setGlowingCellKey(null);
      dropFlashTimeoutRef.current = null;
    }, 650);
  }, []);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const allSorted = useMemo(() => sortEventsByDateTime(events), [events]);
  const eventsByDate = useMemo(() => buildEventsByDate(allSorted), [allSorted]);

  const monthGridDays = useMemo(() => getMonthGridDates(anchorDate), [anchorDate]);
  const weekDates = useMemo(() => getWeekDates(anchorDate), [anchorDate]);
  const dayEvents = useMemo(
    () => eventsByDate[toDateKey(anchorDate)] ?? EMPTY_DAY_EVENTS,
    [eventsByDate, anchorDate],
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
  const eventRevisionById = useMemo(() => {
    const byId: Record<string, number> = {};
    for (const event of events) {
      if (typeof event.revision === "number") {
        byId[event.id] = event.revision;
      }
    }
    return byId;
  }, [events]);

  const withEventRevision = useCallback(
    (eventId: string): { revision?: number } => {
      const revision = eventRevisionById[eventId];
      if (revision === undefined) {
        return {};
      }
      return { revision };
    },
    [eventRevisionById],
  );

  useEffect(() => {
    if (!user || isAuthLoading || isEventsLoading) {
      return;
    }

    const removeStaleSyncedCards =
      activeTab !== "calendar" || !hasActiveCalendarFilters;
    syncTaskEventsToKanban(events, resolvedPriorities, { removeStaleSyncedCards });
  }, [
    user,
    isAuthLoading,
    isEventsLoading,
    activeTab,
    hasActiveCalendarFilters,
    events,
    resolvedPriorities,
    syncTaskEventsToKanban,
  ]);

  const handleSaveEvent = async (input: CreateEventInput, priority: TaskPriority) => {
    await addEvent(input);
    // Store priority keyed by title::date as a secondary lookup
    // until we can associate it with the server-assigned event ID
    handlePriorityChange(`${input.title}::${input.date}`, priority);
    localStore.addAuditEntry({ action: "create", eventId: "", eventTitle: input.title });
    await fetchEvents(liveCalendarQueryFilters);

  };

  const handleDeleteEvent = async (
    eventId: string,
    scope: RecurrenceScope = "this",
  ) => {
    const event = events.find((e) => e.id === eventId);
    await deleteEvent(eventId, { recurrenceScope: scope });
    if (event) {
      localStore.addAuditEntry({ action: "delete", eventId, eventTitle: event.title });
    }
    await fetchEvents(liveCalendarQueryFilters);
    setSelectedEventId(null);
  };

  const handleToggleStatus = async (
    eventId: string,
    nextStatus: EventStatus,
    scope: RecurrenceScope = "this",
  ) => {
    await updateEvent({
      id: eventId,
      status: nextStatus,
      recurrenceScope: scope,
      ...withEventRevision(eventId),
    });
    await fetchEvents(liveCalendarQueryFilters);
  };

  const handleUpdateEvent = async (
    eventId: string,
    input: CreateEventInput,
    priority: TaskPriority,
    scope: RecurrenceScope = "this",
  ) => {
    await updateEvent({
      id: eventId,
      title: input.title,
      type: input.type,
      ...(scope === "this" ? { date: input.date } : {}),
      time: input.time,
      description: input.description,
      recurrence: input.recurrence,
      recurrenceScope: scope,
      ...withEventRevision(eventId),
    });
    handlePriorityChange(eventId, priority);
    await fetchEvents(liveCalendarQueryFilters);
  };

  const handleConvertToTask = async (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    await updateEvent({ id: eventId, type: "task", ...withEventRevision(eventId) });
    localStore.addAuditEntry({
      action: "convert",
      eventId,
      eventTitle: event.title,
      detail: "event → task",
    });
    await fetchEvents(liveCalendarQueryFilters);
  };

  const handleConvertToEvent = async (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    await updateEvent({ id: eventId, type: "event", ...withEventRevision(eventId) });
    localStore.addAuditEntry({
      action: "convert",
      eventId,
      eventTitle: event.title,
      detail: "task → event",
    });
    await fetchEvents(liveCalendarQueryFilters);
  };

  const handleConvertToNote = async (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    localStore.addNote({
      title: event.title,
      content: event.description || "",
      linkedDate: event.date,
      linkedEventId: event.id,
    });
    localStore.addAuditEntry({
      action: "convert",
      eventId,
      eventTitle: event.title,
      detail: "event → note",
    });
  };

  const handleMoveEvent = useCallback(
    async (eventId: string, payload: EventMovePayload) => {
      const sourceEvent = events.find((event) => event.id === eventId);
      if (!sourceEvent) {
        return;
      }

      // If dropping on the same date with no time change, skip
      if (
        sourceEvent.date === payload.date &&
        (payload.time === undefined || payload.time === sourceEvent.time)
      ) {
        return;
      }

      // Open time-picker dialog instead of immediate move
      setMovePickerRequest({
        event: sourceEvent,
        targetDate: payload.date,
        suggestedTime: payload.time,
      });
    },
    [events],
  );

  const handleMoveConfirm = async (result: MoveTimePickerResult) => {
    setMovePickerRequest(null);

    await updateEvent({
      id: result.eventId,
      date: result.date,
      time: result.time,
      recurrenceScope: "this",
      ...withEventRevision(result.eventId),
    });
    await fetchEvents(liveCalendarQueryFilters);

    const cellKey = result.time ? `${result.date}T${result.time}` : result.date;
    triggerDropFlash(cellKey);

  };

  const handleMoveCancel = () => {
    setMovePickerRequest(null);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const handlePrev = () => {
    setUrlState(
      (prev) => ({
        ...prev,
        date: toDateKey(normalizeToDay(shiftAnchorDate(toDayStart(prev.date), prev.view, "prev"))),
      }),
      "push",
    );
  };
  const handleNext = () => {
    setUrlState(
      (prev) => ({
        ...prev,
        date: toDateKey(normalizeToDay(shiftAnchorDate(toDayStart(prev.date), prev.view, "next"))),
      }),
      "push",
    );
  };
  const handleToday = () => {
    setUrlState(
      (prev) => ({
        ...prev,
        date: toDateKey(startOfDay(new Date())),
      }),
      "push",
    );
  };

  const handleSelectDate = useCallback(
    (date: Date) => {
      setUrlState(
        (prev) => ({
          ...prev,
          date: toDateKey(normalizeToDay(date)),
        }),
        "push",
      );
      if (isMobileLayout) {
        setIsSidebarVisible(false);
      }
    },
    [isMobileLayout, setUrlState],
  );

  const handleQuickAdd = useCallback((date: Date) => {
    setAddModalDate(toDateKey(date));
    setShowAddModal(true);
  }, []);

  const handleFilterChange = (nextFilter: string) => {
    setUrlState(
      (prev) => ({
        ...prev,
        category: nextFilter as Calendar2CategoryFilter,
      }),
      "push",
    );
    if (isMobileLayout) {
      setIsSidebarVisible(false);
    }
  };
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarVisible((prev) => {
      const next = !prev;
      if (!isMobileLayout && uiPreferences.sidebarRemember) {
        saveRememberedDesktopSidebarState(next);
      }
      return next;
    });
  }, [isMobileLayout, uiPreferences.sidebarRemember]);

  const renderContent = () => {
    switch (activeTab) {
      case "inbox":
        return (
          <div className="min-h-0 flex-1">
            <InboxPanel
              loading={inboxTasks.loading}
              error={inboxTasks.error}
              anchorDateKey={toDateKey(anchorDate)}
              inbox={inboxTasks.inbox}
              tasks={inboxTasks.tasks}
              subtasksByTaskId={inboxTasks.subtasksByTaskId}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              onCreateQuickItem={async (content) => {
                await inboxTasks.createInboxItem(content, "task");
              }}
              onConvert={async (id, target) => {
                await inboxTasks.convertInboxItem(id, target, {
                  dueDate: target === "task" ? toDateKey(anchorDate) : undefined,
                  date: target === "event" ? toDateKey(anchorDate) : undefined,
                });
              }}
              onArchive={inboxTasks.archiveInboxItem}
              onPanicReset={async () => {
                await inboxTasks.panicReset(toDateKey(anchorDate));
              }}
              onLoadSubtasks={inboxTasks.loadSubtasks}
              onUpdateTask={inboxTasks.updateTask}
              onAddSubtask={inboxTasks.addSubtask}
              onSetSubtaskDone={async (subtaskId, taskId, done) => {
                await inboxTasks.setSubtaskStatus(subtaskId, taskId, done ? "done" : "todo");
              }}
              dailyStats={inboxTasks.dailyStats}
              weeklyStats={inboxTasks.weeklyStats}
              priorityTasksTodayCount={inboxTasks.priorityTasksToday.length}
            />
          </div>
        );
      case "calendar":
        return (
          <div className="min-h-0 flex-1">
            {view === "month" && (
              <Calendar2MonthView
                anchorDate={anchorDate}
                days={monthGridDays}
                eventsByDate={eventsByDate}
                eventPriorities={resolvedPriorities}
                glowingCellKey={glowingCellKey}
                onSelectDate={handleSelectDate}
                onSelectEvent={setSelectedEventId}
                onQuickAdd={handleQuickAdd}
                onMoveEvent={handleMoveEvent}
              />
            )}
            {view === "week" && (
              <Calendar2WeekView
                weekDates={weekDates}
                anchorDate={anchorDate}
                eventsByDate={eventsByDate}
                eventPriorities={resolvedPriorities}
                glowingCellKey={glowingCellKey}
                onSelectDate={handleSelectDate}
                onSelectEvent={setSelectedEventId}
                onQuickAdd={handleQuickAdd}
                onMoveEvent={handleMoveEvent}
              />
            )}
            {view === "day" && (
              <Calendar2DayView
                dayDate={anchorDate}
                dayEvents={dayEvents}
                eventPriorities={resolvedPriorities}
                glowingCellKey={glowingCellKey}
                onSelectEvent={setSelectedEventId}
                onMoveEvent={handleMoveEvent}
              />
            )}
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
      case "ai":
        return (
          <div className="min-h-0 flex-1">
            <Calendar2AiPanel />
          </div>
        );
      default:
        return null;
    }
  };

  const isCompactDensity = uiPreferences.density === "compact";
  const isReducedMotion = uiPreferences.motion === "reduced";

  return (
    <div
      style={CALENDAR2_LINEAR_VARS}
      className={`flex h-dvh flex-col bg-[var(--cal2-bg)] font-[family-name:var(--font-geist-sans)] leading-[1.3] text-[var(--cal2-text-primary)] ${
        isCompactDensity ? "text-[12px]" : "text-[13px]"
      } ${isReducedMotion ? "[&_*]:animate-none [&_*]:duration-0" : ""}`}
    >
      <Calendar2Toolbar
        activeTab={activeTab}
        onTabChange={(nextTab) =>
          setUrlState(
            (prev) => ({
              ...prev,
              tab: nextTab,
            }),
            "push",
          )
        }
        currentView={view}
        periodLabel={periodLabel}
        onViewChange={(nextView) =>
          setUrlState(
            (prev) => ({
              ...prev,
              view: nextView,
            }),
            "push",
          )
        }
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onAdd={() => {
          setAddModalDate(undefined);
          setShowAddModal(true);
        }}
        onQuickCapture={() => setShowQuickCapture(true)}
        onLogout={handleLogout}
        searchValue={searchQuery}
        onSearchChange={(value) =>
          setUrlState((prev) => ({
            ...prev,
            q: value,
          }))
        }
        onToggleSidebar={handleToggleSidebar}
        isSidebarVisible={isSidebarVisible}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          className={`grid h-full w-full grid-cols-1 gap-0 px-0 pb-0 pt-0 ${
            isSidebarVisible ? "lg:grid-cols-[280px_1fr]" : "lg:grid-cols-1"
          }`}
        >
          {/* Sidebar */}
          <div className={`${isSidebarVisible ? "block" : "hidden"} min-h-0`}>
            <Calendar2Sidebar
              anchorDate={anchorDate}
              eventsByDate={eventsByDate}
              categories={categories}
              activeFilter={categoryFilter}
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
            } relative min-h-0 flex-col gap-2 rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] ${
              isCompactDensity ? "p-2 sm:p-2.5" : "p-2 sm:p-3"
            } ${
              isSidebarVisible ? "lg:rounded-l-none lg:border-l-0" : ""
            }`}
          >
            {(isAuthLoading || isEventsLoading) && (
              <div className="pointer-events-none absolute right-3 top-3 z-20 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-3 py-2 text-[11px] text-[var(--cal2-text-secondary)] shadow-[0_6px_16px_-10px_rgba(0,0,0,0.8)]">
                Синхронизация данных...
              </div>
            )}

            {error && (
              <div className="rounded-[6px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent-soft)] px-3 py-2 text-[11px] text-[#d9ddff]">
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
          if (activeTab === "inbox") {
            setShowQuickCapture(true);
            return;
          }
          setAddModalDate(undefined);
          setShowAddModal(true);
        }}
        className="fixed bottom-4 right-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-[8px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent)] text-lg font-semibold text-[var(--cal2-text-primary)] transition-colors hover:bg-[var(--cal2-accent-soft-strong)] md:hidden"
        aria-label="Добавить"
      >
        {activeTab === "inbox" ? "I" : "+"}
      </button>

      <QuickCaptureDialog
        open={showQuickCapture}
        onClose={() => setShowQuickCapture(false)}
        onSave={async (content, typeHint) => {
          await inboxTasks.createInboxItem(content, typeHint);
        }}
      />

      {/* Event view modal */}
      {selectedEvent && (
        <EventModal2
          event={selectedEvent}
          mode="view"
          eventPriorities={resolvedPriorities}
          existingEvents={events}
          categories={localStore.categories}
          linkedNotes={localStore.notes.filter((n) => n.linkedEventId === selectedEvent.id)}
          linkedKanbanCards={localStore.kanbanCards.filter((c) => c.linkedEventId === selectedEvent.id)}
          onClose={() => setSelectedEventId(null)}
          onDelete={handleDeleteEvent}
          onToggleStatus={handleToggleStatus}
          onPriorityChange={handlePriorityChange}
          onUpdate={handleUpdateEvent}
          onConvertToTask={handleConvertToTask}
          onConvertToEvent={handleConvertToEvent}
          onConvertToNote={handleConvertToNote}
        />
      )}

      {/* Add event modal */}
      {showAddModal && (
        <EventModal2
          mode="add"
          initialDate={addModalDate}
          eventPriorities={resolvedPriorities}
          existingEvents={events}
          categories={localStore.categories}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveEvent}
        />
      )}

      {/* Move event time picker dialog */}
      <MoveTimePickerDialog
        request={movePickerRequest}
        onConfirm={handleMoveConfirm}
        onCancel={handleMoveCancel}
      />
    </div>
  );
}
