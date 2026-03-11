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
      data-workspace-top-nav={activeId}
      className="inline-flex rounded-[10px] border border-white/10 bg-[rgba(16,17,21,0.86)] p-1 shadow-[0_18px_48px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl"
    >
      {items.map((item) => {
        const sharedClassName = cn(
          "rounded-[8px] px-3 py-1.5 text-[12px] font-medium leading-[1.2] transition-colors",
          item.active
            ? "border border-[rgba(94,106,210,0.42)] bg-[rgba(94,106,210,0.22)] text-white"
            : "border border-transparent text-white/54 hover:bg-white/5 hover:text-white/86",
        );

        if (item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
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
            aria-current={item.active ? "page" : undefined}
            className={sharedClassName}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
