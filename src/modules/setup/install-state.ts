import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type SetupCompletionMode = "setup" | "recovery";

interface InstallStatePayload {
  mode: SetupCompletionMode;
  initialUserEmail?: string;
}

interface InstallStateRecord {
  status: "completed";
  mode: SetupCompletionMode;
  updatedAt: string;
  initialUserEmail?: string;
}

const INSTALL_STATE_DIR = path.join(process.cwd(), ".netden");
const INSTALL_STATE_FILE = path.join(INSTALL_STATE_DIR, "install-state.json");

export async function writeInstallState(payload: InstallStatePayload): Promise<void> {
  const record: InstallStateRecord = {
    status: "completed",
    mode: payload.mode,
    updatedAt: new Date().toISOString(),
    initialUserEmail: payload.initialUserEmail,
  };

  await mkdir(INSTALL_STATE_DIR, { recursive: true });
  await writeFile(INSTALL_STATE_FILE, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}
