import { NextResponse } from "next/server";
import { HttpError, readJsonBody } from "@/lib/server/validators";
import { writeInstallState } from "@/modules/setup/install-state";
import {
  buildSetupSummary,
  isDatabaseConfigured,
  provisionDatabase,
  validateSetupRecoverInput,
} from "@/lib/server/setup";
import { SetupErrorResponse, SetupRecoverResponse } from "@/lib/types";

function handleSetupError(error: unknown) {
  if (error instanceof HttpError) {
    const body: SetupErrorResponse = { error: error.message };
    return NextResponse.json(body, { status: error.status });
  }

  console.error("Unhandled setup recovery error:", error);
  const body: SetupErrorResponse = { error: "Internal server error" };
  return NextResponse.json(body, { status: 500 });
}

export async function POST(request: Request) {
  try {
    if (isDatabaseConfigured()) {
      throw new HttpError(409, "Recovery is disabled because DATABASE_URL is already configured");
    }

    const body = await readJsonBody(request, { maxSizeKB: 32 });

    const input = validateSetupRecoverInput(body);
    const provisioned = await provisionDatabase(input, "recovery");

    if (provisioned.usersCount === 0) {
      throw new HttpError(
        409,
        "Recovery requires an existing NetDen user in the selected database",
      );
    }

    const response: SetupRecoverResponse = {
      ok: true,
      recovered: buildSetupSummary({
        databaseUrl: provisioned.databaseUrl,
        appRole: provisioned.appRole,
        appPassword: provisioned.appPassword,
      }),
    };

    try {
      await writeInstallState({
        mode: "recovery",
      });
    } catch (stateError) {
      console.warn("Failed to persist install-state:", stateError);
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleSetupError(error);
  }
}
