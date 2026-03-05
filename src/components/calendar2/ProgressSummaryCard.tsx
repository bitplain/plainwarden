"use client";

import type { StatsDaily, StatsWeekly } from "@/lib/types";

interface ProgressSummaryCardProps {
  daily: StatsDaily | null;
  weekly: StatsWeekly | null;
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-[var(--cal2-text-secondary)]">{label}</span>
      <span className="font-semibold text-[var(--cal2-text-primary)]">{value}</span>
    </div>
  );
}

export default function ProgressSummaryCard({ daily, weekly }: ProgressSummaryCardProps) {
  return (
    <section className="rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-3">
      <h3 className="mb-2 text-[12px] font-semibold text-[var(--cal2-text-primary)]">Progress</h3>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">Сегодня</p>
        <StatRow label="Выполнено задач" value={daily?.tasksCompleted ?? 0} />
        <StatRow label="Просрочено" value={daily?.overdueCount ?? 0} />
        <StatRow label="Приоритетов" value={daily?.priorityPlanned ?? 0} />
      </div>

      <div className="mt-3 border-t border-[var(--cal2-border)] pt-3">
        <p className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--cal2-text-secondary)]">Неделя</p>
        <StatRow label="Выполнено задач" value={weekly?.tasksCompleted ?? 0} />
        <StatRow label="Просрочено" value={weekly?.overdueCount ?? 0} />
      </div>
    </section>
  );
}
