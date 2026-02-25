export type ParsedCommand = {
  cmd: string;
  args: string[];
};

export type AllowlistedCommandSpec = {
  id: string;
  file: string;
  args: string[];
  description: string;
  timeoutMs: number;
  maxOutputBytes: number;
};

export type RunCommandResult = {
  ok: boolean;
  id: string;
  file: string;
  args: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  error?: string;
};
