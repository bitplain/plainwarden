"use client";

import { startOfDay } from "date-fns";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CALENDAR2_LINEAR_VARS } from "@/components/calendar2/calendar2-theme";
import type { Calendar2View } from "@/components/calendar2/calendar2-types";
import {
  formatPeriodLabel,
  shiftAnchorDate,
  toDateKey,
} from "@/components/calendar2/date-utils";
import { useCalendar2UrlStore } from "@/components/calendar2/calendar2-url-store";
import WorkspaceTopNav from "@/components/workspace/WorkspaceTopNav";
import {
  dispatchWorkspaceEvent,
  WORKSPACE_ADD_EVENT_EVENT,
  WORKSPACE_QUICK_CAPTURE_EVENT,
  WORKSPACE_SIDEBAR_STATE_EVENT,
  WORKSPACE_TOGGLE_SIDEBAR_EVENT,
} from "@/components/workspace/workspace-events";
import {
  getWorkspaceSectionFromPathname,
  WORKSPACE_NAV_ITEMS,
} from "@/components/workspace/workspace-nav";
import { useNetdenStore } from "@/lib/store";

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

function CalendarHeaderControls() {
  const { state, setState } = useCalendar2UrlStore();
  const anchorDate = useMemo(() => toDayStart(state.date), [state.date]);
  const periodLabel = useMemo(
    () => formatPeriodLabel(anchorDate, state.view),
    [anchorDate, state.view],
  );

  const shiftDate = (direction: "prev" | "next") => {
    setState(
      (prev) => ({
        ...prev,
        date: toDateKey(shiftAnchorDate(anchorDate, prev.view, direction)),
      }),
      "push",
    );
  };

  const setView = (nextView: Calendar2View) => {
    setState(
      (prev) => ({
        ...prev,
        view: nextView,
      }),
      "push",
    );
  };

  const setToday = () => {
    setState(
      (prev) => ({
        ...prev,
        date: toDateKey(startOfDay(new Date())),
      }),
      "push",
    );
  };

  const setSearch = (value: string) => {
    setState((prev) => ({
      ...prev,
      q: value,
    }));
  };

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => shiftDate("prev")}
          className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1 text-[12px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
        >
          ←
        </button>
        <button
          type="button"
          onClick={setToday}
          className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1 text-[12px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
        >
          Сегодня
        </button>
        <button
          type="button"
          onClick={() => shiftDate("next")}
          className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1 text-[12px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
        >
          →
        </button>
        <span className="ml-1.5 text-[13px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)] sm:text-[14px]">
          {periodLabel}
        </span>
      </div>

      <div className="inline-flex rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-0.5">
        {[
          { id: "month", label: "Месяц" },
          { id: "week", label: "Неделя" },
          { id: "day", label: "День" },
        ].map((option) => {
          const isActive = option.id === state.view;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setView(option.id as Calendar2View)}
              className={`rounded-[4px] px-2.5 py-1 text-[11px] font-medium leading-[1.2] transition-colors sm:text-[12px] ${
                isActive
                  ? "border border-[rgba(94,106,210,0.42)] bg-[var(--cal2-accent-soft)] text-[var(--cal2-text-primary)]"
                  : "text-[var(--cal2-text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--cal2-text-primary)]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <label className="inline-flex h-[30px] min-w-[220px] items-center rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2">
        <span className="mr-2 text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
          Поиск
        </span>
        <input
          type="text"
          value={state.q}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Название или описание"
          className="h-full w-full bg-transparent text-[12px] text-[var(--cal2-text-primary)] outline-none placeholder:text-[var(--cal2-text-disabled)]"
        />
      </label>
    </div>
  );
}

interface WorkspaceShellProps {
  children: ReactNode;
}

export default function WorkspaceShell({ children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const logout = useNetdenStore((state) => state.logout);
  const activeSection = getWorkspaceSectionFromPathname(pathname);
  const isCalendarRoute = activeSection === "calendar";
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  useEffect(() => {
    const onSidebarState = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      if (typeof detail?.open === "boolean") {
        setIsSidebarVisible(detail.open);
      }
    };

    window.addEventListener(WORKSPACE_SIDEBAR_STATE_EVENT, onSidebarState as EventListener);
    return () =>
      window.removeEventListener(WORKSPACE_SIDEBAR_STATE_EVENT, onSidebarState as EventListener);
  }, []);

  return (
    <div
      style={CALENDAR2_LINEAR_VARS}
      data-workspace-shell={activeSection}
      className="flex h-dvh flex-col bg-[var(--cal2-bg)] font-[family-name:var(--font-geist-sans)] leading-[1.3] text-[var(--cal2-text-primary)]"
    >
      <header className="border-b border-[var(--cal2-border)] bg-[var(--cal2-surface-1)]">
        <div className="flex w-full flex-col gap-2.5 px-3 py-3 sm:px-5 xl:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <Link
                href="/settings"
                className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1.5 text-[11px] font-medium leading-[1.2] text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
              >
                Настройки
              </Link>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--cal2-text-secondary)]">
                  NetDen
                </p>
                <h1 className="text-[15px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)] sm:text-base">
                  Календарь 2.0
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {isCalendarRoute ? (
                <>
                  <button
                    type="button"
                    onClick={() => dispatchWorkspaceEvent(WORKSPACE_QUICK_CAPTURE_EVENT)}
                    className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)] sm:text-[12px]"
                  >
                    Quick Capture
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarVisible((prev) => !prev);
                      dispatchWorkspaceEvent(WORKSPACE_TOGGLE_SIDEBAR_EVENT);
                    }}
                    className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
                  >
                    {isSidebarVisible ? "Скрыть панель" : "Показать панель"}
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatchWorkspaceEvent(WORKSPACE_ADD_EVENT_EVENT)}
                    className="rounded-[6px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent-soft)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--cal2-text-primary)] transition-colors hover:bg-[var(--cal2-accent-soft-strong)] sm:text-[12px]"
                  >
                    + Добавить
                  </button>
                </>
              ) : null}

              <button
                type="button"
                onClick={async () => {
                  await logout();
                  window.location.href = "/login";
                }}
                className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)] sm:text-[12px]"
              >
                Выйти
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <WorkspaceTopNav activeId={activeSection} items={WORKSPACE_NAV_ITEMS} />
            {isCalendarRoute ? <CalendarHeaderControls /> : null}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
