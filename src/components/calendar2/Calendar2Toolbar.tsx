import type { Calendar2View } from "@/components/calendar2/calendar2-types";

interface Calendar2ToolbarProps {
  currentView: Calendar2View;
  periodLabel: string;
  onViewChange: (view: Calendar2View) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onAdd: () => void;
  onQuickCapture: () => void;
  onToggleSidebar: () => void;
  isSidebarVisible: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

const VIEW_OPTIONS: { id: Calendar2View; label: string }[] = [
  { id: "month", label: "Месяц" },
  { id: "week", label: "Неделя" },
  { id: "day", label: "День" },
];

export default function Calendar2Toolbar({
  currentView,
  periodLabel,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onAdd,
  onQuickCapture,
  onToggleSidebar,
  isSidebarVisible,
  searchValue,
  onSearchChange,
}: Calendar2ToolbarProps) {
  const shouldShowSidebarButton = true;

  return (
    <section className="rounded-[24px] border border-[var(--cal2-border)] bg-[rgba(10,10,12,0.62)] px-4 py-3 shadow-[0_18px_48px_-32px_rgba(0,0,0,0.88)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onQuickCapture}
            className="rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)] sm:text-[12px]"
          >
            Quick Capture
          </button>
          {shouldShowSidebarButton ? (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
            >
              {isSidebarVisible ? "Скрыть панель" : "Показать панель"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onAdd}
            className="rounded-[8px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent-soft)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--cal2-text-primary)] transition-colors hover:bg-[var(--cal2-accent-soft-strong)] sm:text-[12px]"
          >
            + Добавить
          </button>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPrev}
              className="rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1 text-[12px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
            >
              ←
            </button>
            <button
              type="button"
              onClick={onToday}
              className="rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1 text-[12px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1 text-[12px] font-medium text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
            >
              →
            </button>
            <span className="ml-1.5 text-[13px] font-semibold leading-[1.2] text-[var(--cal2-text-primary)] sm:text-[14px]">
              {periodLabel}
            </span>
          </div>

          <div className="inline-flex rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-0.5">
            {VIEW_OPTIONS.map((option) => {
              const isActive = option.id === currentView;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onViewChange(option.id)}
                  className={`rounded-[6px] px-2.5 py-1 text-[11px] font-medium leading-[1.2] transition-colors sm:text-[12px] ${
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

          <label className="inline-flex h-[34px] min-w-[220px] items-center rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2">
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
        </div>
      </div>
    </section>
  );
}
