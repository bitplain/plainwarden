import { NextResponse } from "next/server";
import { getPushConfigurationStatus } from "@/lib/server/push-config";

export async function GET() {
  const push = getPushConfigurationStatus();

  return NextResponse.json({
    status: "ok",
    checks: {
      push: {
        configured: push.configured,
        missing: push.missing,
        invalid: push.invalid,
      },
    },
  });
}
