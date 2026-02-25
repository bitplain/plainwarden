import { NextResponse } from "next/server";
import { hasUsers } from "@/lib/server/json-db";
import { isDatabaseConfigured } from "@/lib/server/setup";

export async function GET() {
  const databaseConfigured = isDatabaseConfigured();

  if (!databaseConfigured) {
    return NextResponse.json({
      databaseConfigured: false,
      initialized: false,
      setupRequired: true,
    });
  }

  let initialized = false;
  try {
    initialized = await hasUsers();
  } catch (error) {
    console.error("Failed to read setup state:", error);
  }

  return NextResponse.json({
    databaseConfigured: true,
    initialized,
    setupRequired: !initialized,
  });
}
