import { NextResponse } from "next/server";
import { getPushConfigurationStatus } from "@/lib/server/push-config";
import { getSessionSecretHealth } from "@/lib/server/session";

export async function GET() {
  const push = getPushConfigurationStatus();
  const session = getSessionSecretHealth();
  const cronConfigured = Boolean(process.env.NETDEN_CRON_SECRET?.trim());

  return NextResponse.json({
    status: "ok",
    checks: {
      push: {
        configured: push.configured,
        missing: push.missing,
        invalid: push.invalid,
      },
      cron: {
        configured: cronConfigured,
      },
      session,
    },
  });
}
