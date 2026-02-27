import Link from "next/link";
import type { Calendar2View, Calendar2Tab } from "@/components/calendar2/calendar2-types";

interface Calendar2ToolbarProps {
  activeTab: Calendar2Tab;
  onTabChange: (tab: Calendar2Tab) => void;
  currentView: Calendar2View;
  periodLabel: string;
  onViewChange: (view: Calendar2View) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onAdd: () => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
  isSidebarVisible: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  dateFromValue: string;
  dateToValue: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClearCalendarFilters: () => void;
}

const TAB_OPTIONS: { id: Calendar2Tab; label: string }[] = [
  { id: "calendar", label: "Календарь" },
  { id: "planner", label: "Ежедневник" },
  { id: "kanban", label: "Канбан" },
  { id: "notes", label: "Заметки" },
];

const VIEW_OPTIONS: { id: Calendar2View; label: string }[] = [
  { id: "month", label: "Месяц" },
  { id: "week", label: "Неделя" },
  { id: "day", label: "День" },
];

export default function Calendar2Toolbar({
  activeTab,
  onTabChange,
  currentView,
  periodLabel,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onAdd,
  onLogout,
  onToggleSidebar,
  isSidebarVisible,
  searchValue,
  onSearchChange,
  dateFromValue,
  dateToValue,
  onDateFromChange,
  onDateToChange,
  onClearCalendarFilters,
}: Calendar2ToolbarProps) {
  return (
    <header className="border-b border-[var(--cal2-border)] bg-[var(--cal2-surface-1)]">
      <div className="flex w-full flex-col gap-2.5 px-3 py-3 sm:px-5 xl:px-6">
        {/* Top row: branding + actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1.5 text-[11px] font-medium leading-[1.2] text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
            >
              ← Терминал
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
            <button
              type="button"
              onClick={onToggleSidebar}
              className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)] lg:hidden"
            >
              {isSidebarVisible ? "Скрыть" : "Панель"}
            </button>
            <button
              type="button"
              onClick={onAdd}
              className="rounded-[6px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent-soft)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--cal2-text-primary)] transition-colors hover:bg-[var(--cal2-accent-soft-strong)] sm:text-[12px]"
            >
              + Добавить
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)] sm:text-[12px]"
            >
              Выйти
            </button>
          </div>
        </div>

        {/* Tabs row */}
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-0.5">
            {TAB_OPTIONS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`rounded-[4px] px-2.5 py-1.5 text-[11px] font-medium leading-[1.2] transition-colors sm:text-[12px] ${
                    isActive
                      ? "border border-[rgba(94,106,210,0.42)] bg-[var(--cal2-accent-soft)] text-[var(--cal2-text-primary)]"
                      : "text-[var(--cal2-text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--cal2-text-primary)]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Calendar navigation — only visible on calendar tab */}
          {activeTab === "calendar" && (
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onPrev}
                  className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1 text-[12px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={onToday}
                  className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1 text-[12px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
                >
                  Сегодня
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1 text-[12px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
                >
                  →
                </button>
                <span className="ml-1.5 text-[13px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)] sm:text-[14px]">
                  {periodLabel}
                </span>
              </div>

              <div className="inline-flex rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-0.5">
                {VIEW_OPTIONS.map((option) => {
                  const isActive = option.id === currentView;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onViewChange(option.id)}
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
                  value={searchValue}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Название или описание"
                  className="h-full w-full bg-transparent text-[12px] text-[var(--cal2-text-primary)] outline-none placeholder:text-[var(--cal2-text-disabled)]"
                />
              </label>

              <label className="inline-flex h-[30px] items-center rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2">
                <span className="mr-2 text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                  От
                </span>
                <input
                  type="date"
                  value={dateFromValue}
                  onChange={(event) => onDateFromChange(event.target.value)}
                  className="h-full bg-transparent text-[12px] text-[var(--cal2-text-primary)] outline-none"
                />
              </label>

              <label className="inline-flex h-[30px] items-center rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2">
                <span className="mr-2 text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">
                  До
                </span>
                <input
                  type="date"
                  value={dateToValue}
                  onChange={(event) => onDateToChange(event.target.value)}
                  className="h-full bg-transparent text-[12px] text-[var(--cal2-text-primary)] outline-none"
                />
              </label>

              <button
                type="button"
                onClick={onClearCalendarFilters}
                className="h-[30px] rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 text-[11px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
              >
                Сброс
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
