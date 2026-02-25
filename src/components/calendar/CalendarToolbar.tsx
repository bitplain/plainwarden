import Link from "next/link";
import type { CalendarView } from "@/components/calendar/calendar-types";

interface CalendarToolbarProps {
  currentView: CalendarView;
  periodLabel: string;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onAdd: () => void;
  onLogout?: () => void;
  showTerminalLink?: boolean;
  showLogout?: boolean;
  onToggleSidebar?: () => void;
  isSidebarVisible?: boolean;
}

const VIEW_OPTIONS: { id: CalendarView; label: string }[] = [
  { id: "month", label: "Месяц" },
  { id: "week", label: "Неделя" },
  { id: "day", label: "День" },
];

export default function CalendarToolbar({
  currentView,
  periodLabel,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onAdd,
  onLogout,
  showTerminalLink = true,
  showLogout = true,
  onToggleSidebar,
  isSidebarVisible = false,
}: CalendarToolbarProps) {
  return (
    <header className="calendar-toolbar border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="flex w-full flex-col gap-3 px-3 py-3 sm:px-5 xl:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {showTerminalLink ? (
              <Link
                href="/"
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10"
              >
                ← Терминал
              </Link>
            ) : null}
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">NetDen</p>
              <h1 className="text-base font-semibold text-zinc-100 sm:text-lg">Календарь</h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {onToggleSidebar ? (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="rounded-lg border border-white/12 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-white/10 lg:hidden"
              >
                {isSidebarVisible ? "Календарь" : "Панель"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onAdd}
              className="rounded-lg border border-sky-400/35 bg-sky-500/12 px-2.5 py-1.5 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/20 sm:text-sm"
            >
              + Добавить событие
            </button>
            {showLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg border border-white/12 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-white/10 sm:text-sm"
              >
                Выйти
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              className="rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 text-sm text-zinc-200 transition-colors hover:bg-white/10"
            >
              ←
            </button>
            <button
              type="button"
              onClick={onToday}
              className="rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 text-sm text-zinc-200 transition-colors hover:bg-white/10"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 text-sm text-zinc-200 transition-colors hover:bg-white/10"
            >
              →
            </button>
            <span className="ml-1 text-sm font-medium text-zinc-200 sm:text-base">{periodLabel}</span>
          </div>

          <div className="inline-flex rounded-lg border border-white/12 bg-black/40 p-1">
            {VIEW_OPTIONS.map((option) => {
              const isActive = option.id === currentView;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onViewChange(option.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:text-sm ${
                    isActive
                      ? "bg-white text-zinc-900 shadow-[0_8px_20px_-14px_rgba(255,255,255,0.95)]"
                      : "text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
