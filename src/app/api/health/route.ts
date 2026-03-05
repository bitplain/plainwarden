import { NextResponse } from "next/server";
import { getRuntimePushStatus } from "@/lib/server/push-runtime-config";
import { getSessionSecretHealth } from "@/lib/server/session";

export async function GET() {
  const push = await getRuntimePushStatus();
  const session = getSessionSecretHealth();

  return NextResponse.json({
    status: "ok",
    checks: {
      push: {
        configured: push.configured,
        missing: push.missing,
        invalid: push.invalid,
        source: push.source,
      },
      cron: {
        configured: push.cronConfigured,
      },
      session,
    },
  });
}
