import { NextRequest, NextResponse } from "next/server";
import { getSetupPreset } from "@/lib/server/setup";
import { SetupConnectionMode, SetupErrorResponse } from "@/lib/types";

function parseMode(value: string | null): SetupConnectionMode | null {
  if (value === "docker" || value === "remote") {
    return value;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const mode = parseMode(request.nextUrl.searchParams.get("mode"));

  if (!mode) {
    const body: SetupErrorResponse = {
      error: "mode must be either 'docker' or 'remote'",
    };
    return NextResponse.json(body, { status: 400 });
  }

  return NextResponse.json(getSetupPreset(mode), { status: 200 });
}
