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
  onLogout: () => void;
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
}: CalendarToolbarProps) {
  return (
    <header className="calendar-toolbar border-b border-white/10 bg-black/35 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-4 sm:px-6 xl:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10"
            >
              ← Терминал
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">NetDen</p>
              <h1 className="text-lg font-semibold text-zinc-100 sm:text-xl">Календарь</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAdd}
              className="rounded-xl border border-sky-400/35 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/25 sm:text-sm"
            >
              + Добавить событие
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:bg-white/10 sm:text-sm"
            >
              Выйти
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              className="rounded-xl border border-white/12 bg-white/5 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-white/10"
            >
              ←
            </button>
            <button
              type="button"
              onClick={onToday}
              className="rounded-xl border border-white/12 bg-white/5 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-white/10"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded-xl border border-white/12 bg-white/5 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-white/10"
            >
              →
            </button>
            <span className="ml-2 text-sm font-medium text-zinc-200 sm:text-base">{periodLabel}</span>
          </div>

          <div className="inline-flex rounded-xl border border-white/12 bg-black/40 p-1">
            {VIEW_OPTIONS.map((option) => {
              const isActive = option.id === currentView;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onViewChange(option.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                    isActive
                      ? "bg-white text-zinc-900 shadow-[0_8px_26px_-18px_rgba(255,255,255,0.95)]"
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
