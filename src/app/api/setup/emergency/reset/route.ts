import { NextResponse } from "next/server";
import { SetupErrorResponse } from "@/lib/types";

export async function POST() {
  const response: SetupErrorResponse = {
    error: "Emergency password reset is disabled. Use /api/setup/emergency/factory-reset",
    canFactoryReset: true,
    reasonCode: "legacy_endpoint_disabled",
  };
  return NextResponse.json(response, { status: 410 });
}
