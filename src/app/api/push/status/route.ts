import { NextResponse } from "next/server";
import { getPushConfigurationStatus } from "@/lib/server/push-config";

export const dynamic = "force-dynamic";

function readTrimmed(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const config = getPushConfigurationStatus();
  const vapidPublicKey = readTrimmed(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const cronConfigured = Boolean(readTrimmed(process.env.NETDEN_CRON_SECRET));

  return NextResponse.json(
    {
      supported: config.configured,
      configured: config.configured,
      missing: config.missing,
      invalid: config.invalid,
      vapidPublicKey,
      cronConfigured,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
