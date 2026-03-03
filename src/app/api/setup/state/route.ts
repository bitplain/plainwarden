import { NextResponse } from "next/server";
import { readSetupState } from "@/lib/server/setup";
import { SetupStateResponse } from "@/lib/types";

export async function GET() {
  const state: SetupStateResponse = await readSetupState();
  return NextResponse.json(state);
}
