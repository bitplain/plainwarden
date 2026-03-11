import Link from "next/link";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export interface WorkspaceTopNavItem {
  id: string;
  label: string;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}

interface WorkspaceTopNavProps {
  activeId: string;
  items: WorkspaceTopNavItem[];
}

export default function WorkspaceTopNav({
  activeId,
  items,
}: WorkspaceTopNavProps) {
  return (
    <nav
      aria-label="Workspace sections"
      data-workspace-top-nav={activeId}
      className="inline-flex flex-wrap items-center gap-1 rounded-[22px] border border-[var(--cal2-border,rgba(255,255,255,0.08))] bg-[rgba(10,10,12,0.82)] p-1.5 shadow-[0_24px_70px_-42px_rgba(0,0,0,0.92)] backdrop-blur-xl"
    >
      {items.map((item) => {
        const isActive = item.active ?? item.id === activeId;
        const sharedClassName = cn(
          "inline-flex items-center justify-center rounded-[16px] border px-4 py-3 text-[13px] font-medium leading-none tracking-[-0.02em] transition-[background-color,border-color,color,box-shadow]",
          isActive
            ? "border-[rgba(94,106,210,0.45)] bg-[rgba(94,106,210,0.18)] text-[var(--cal2-text-primary,#F0F0F0)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            : "border-transparent text-[var(--cal2-text-secondary,#8a8f98)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--cal2-text-primary,#F0F0F0)]",
        );

        if (item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={sharedClassName}
            >
              {item.label}
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            aria-current={isActive ? "page" : undefined}
            className={sharedClassName}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
