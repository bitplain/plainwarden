import { NextResponse } from "next/server";
import { getRuntimePushStatus } from "@/lib/server/push-runtime-config";

export async function GET() {
  const status = await getRuntimePushStatus();

  return NextResponse.json(
    {
      supported: status.configured,
      configured: status.configured,
      missing: status.missing,
      invalid: status.invalid,
      vapidPublicKey: status.vapidPublicKey,
      cronConfigured: status.cronConfigured,
      source: status.source,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
