export type WorkspaceSectionId = "ai-i" | "calendar" | "ai" | "kanban" | "notes";

export interface WorkspaceNavItem {
  id: WorkspaceSectionId;
  label: string;
  href: string;
}

export const WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  { id: "ai-i", label: "AI-I", href: "/" },
  { id: "calendar", label: "Календарь", href: "/calendar" },
  { id: "ai", label: "AI", href: "/ai" },
  { id: "kanban", label: "Канбан", href: "/kanban" },
  { id: "notes", label: "Заметки", href: "/notes" },
];

export function getWorkspaceSectionFromPathname(pathname: string): WorkspaceSectionId {
  if (pathname === "/calendar") {
    return "calendar";
  }
  if (pathname === "/ai") {
    return "ai";
  }
  if (pathname === "/kanban") {
    return "kanban";
  }
  if (pathname === "/notes") {
    return "notes";
  }
  return "ai-i";
}
