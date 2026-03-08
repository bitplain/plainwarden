// Keep the outer calendar shell scrollable until the wide two-column inbox layout takes over.
export const CALENDAR2_MOBILE_SCROLL_SHELL_CLASSNAME =
  "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain pb-[calc(7rem+env(safe-area-inset-bottom))] xl:overflow-hidden xl:pb-0";

export const INBOX_LIST_SCROLL_CLASSNAME =
  "space-y-2 xl:max-h-[calc(100dvh-24rem)] xl:overflow-y-auto xl:pr-1";
