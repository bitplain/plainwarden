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
}: Calendar2ToolbarProps) {
  return (
    <header className="border-b border-white/[0.08] bg-[#1a1a2e]/90 backdrop-blur-xl">
      <div className="flex w-full flex-col gap-3 px-3 py-3 sm:px-5 xl:px-6">
        {/* Top row: branding + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-lg border border-white/[0.08] bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-zinc-100"
            >
              ← Терминал
            </Link>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-400/70">
                NetDen
              </p>
              <h1 className="text-base font-semibold text-zinc-100 sm:text-lg">
                Календарь 2.0
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="rounded-lg border border-white/[0.08] bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 lg:hidden"
            >
              {isSidebarVisible ? "Скрыть" : "Панель"}
            </button>
            <button
              type="button"
              onClick={onAdd}
              className="rounded-lg border border-indigo-400/30 bg-indigo-500/15 px-2.5 py-1.5 text-xs font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/25 sm:text-sm"
            >
              + Добавить
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-white/[0.08] bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 sm:text-sm"
            >
              Выйти
            </button>
          </div>
        </div>

        {/* Tabs row */}
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-lg border border-white/[0.08] bg-black/30 p-0.5">
            {TAB_OPTIONS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                    isActive
                      ? "bg-indigo-500/20 text-indigo-200 shadow-[0_0_12px_-4px_rgba(99,102,241,0.4)]"
                      : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Calendar navigation — only visible on calendar tab */}
          {activeTab === "calendar" && (
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onPrev}
                  className="rounded-lg border border-white/[0.08] bg-white/5 px-2.5 py-1 text-sm text-zinc-300 transition-colors hover:bg-white/10"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={onToday}
                  className="rounded-lg border border-white/[0.08] bg-white/5 px-2.5 py-1 text-sm text-zinc-300 transition-colors hover:bg-white/10"
                >
                  Сегодня
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="rounded-lg border border-white/[0.08] bg-white/5 px-2.5 py-1 text-sm text-zinc-300 transition-colors hover:bg-white/10"
                >
                  →
                </button>
                <span className="ml-1.5 text-sm font-medium text-zinc-200 sm:text-base">
                  {periodLabel}
                </span>
              </div>

              <div className="inline-flex rounded-lg border border-white/[0.08] bg-black/30 p-0.5">
                {VIEW_OPTIONS.map((option) => {
                  const isActive = option.id === currentView;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onViewChange(option.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:text-sm ${
                        isActive
                          ? "bg-indigo-500/20 text-indigo-200 shadow-[0_0_12px_-4px_rgba(99,102,241,0.4)]"
                          : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
