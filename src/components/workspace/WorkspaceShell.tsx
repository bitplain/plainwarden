"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CALENDAR2_LINEAR_VARS } from "@/components/calendar2/calendar2-theme";
import { useNetdenStore } from "@/lib/store";
import WorkspaceTopNav from "@/components/workspace/WorkspaceTopNav";
import {
  getWorkspaceSectionFromPathname,
  WORKSPACE_NAV_ITEMS,
} from "@/components/workspace/workspace-nav";

interface WorkspaceShellProps {
  children: ReactNode;
}

export default function WorkspaceShell({ children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const logout = useNetdenStore((state) => state.logout);
  const activeSection = getWorkspaceSectionFromPathname(pathname);
  const actionClassName =
    "rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1.5 text-[11px] font-medium leading-[1.2] text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]";

  return (
    <div
      style={CALENDAR2_LINEAR_VARS}
      data-workspace-shell={activeSection}
      className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(94,106,210,0.1),transparent_24%),linear-gradient(180deg,#08080a,#121216)] font-[family-name:var(--font-geist-sans)] text-[var(--cal2-text-primary)]"
    >
      <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col px-3 pb-6 pt-4 sm:px-5 lg:px-6">
        <header className="border-b border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-1 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <WorkspaceTopNav activeId={activeSection} items={WORKSPACE_NAV_ITEMS} />

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/settings"
                className={actionClassName}
              >
                Настройки
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  window.location.href = "/login";
                }}
                className={actionClassName}
              >
                Выйти
              </button>
            </div>
          </div>
        </header>

        <div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
