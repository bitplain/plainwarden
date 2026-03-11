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
      className="inline-flex flex-wrap rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-0.5"
    >
      {items.map((item) => {
        const isActive = item.active ?? item.id === activeId;
        const sharedClassName = cn(
          "rounded-[4px] px-2.5 py-1.5 text-[11px] font-medium leading-[1.2] transition-colors sm:text-[12px]",
          isActive
            ? "border border-[rgba(94,106,210,0.42)] bg-[var(--cal2-accent-soft)] text-[var(--cal2-text-primary)]"
            : "text-[var(--cal2-text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--cal2-text-primary)]",
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
