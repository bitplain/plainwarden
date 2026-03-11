export const WORKSPACE_QUICK_CAPTURE_EVENT = "workspace:quick-capture";
export const WORKSPACE_ADD_EVENT_EVENT = "workspace:add-event";
export const WORKSPACE_TOGGLE_SIDEBAR_EVENT = "workspace:toggle-sidebar";
export const WORKSPACE_SIDEBAR_STATE_EVENT = "workspace:sidebar-state";

export function dispatchWorkspaceEvent(name: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(name));
}

export function dispatchWorkspaceSidebarState(open: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_SIDEBAR_STATE_EVENT, {
      detail: { open },
    }),
  );
}
