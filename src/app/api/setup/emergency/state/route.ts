import { NextResponse } from "next/server";
import { SetupErrorResponse } from "@/lib/types";

export async function GET() {
  const response: SetupErrorResponse = {
    error: "Emergency account recovery is disabled. Use /api/setup/emergency/factory-reset",
    canFactoryReset: true,
  };
  return NextResponse.json(response, { status: 410 });
}
