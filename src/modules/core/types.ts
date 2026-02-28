export type TerminalMode = "slash" | "shell";

export type TerminalAction =
  | "clear"
  | "navigate"
  | "server"
  | "logout"
  | "login"
  | "undock"
  | "open_settings";

export interface TerminalComposerState {
  isDocked: boolean;
  isMobile: boolean;
  mode: TerminalMode;
}

export interface TerminalCommandResult {
  output: string[];
  action?: TerminalAction;
  silent?: boolean;
  navigateTo?: string;
  serverRequest?: {
    line: string;
  };
  nextMode?: TerminalMode;
}

export interface NetdenModule {
  id: string;
  routes?: string[];
  commands?: string[];
  guards?: string[];
  initHooks?: string[];
  description?: string;
}
