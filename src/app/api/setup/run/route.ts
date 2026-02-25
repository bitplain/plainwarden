import { NextResponse } from "next/server";
import { HttpError, readJsonBody } from "@/lib/server/validators";
import { writeInstallState } from "@/modules/setup/install-state";
import {
  buildSetupSummary,
  createInitialUserInDatabase,
  isDatabaseConfigured,
  provisionDatabase,
  validateSetupRunInput,
} from "@/lib/server/setup";
import { SetupErrorResponse, SetupRunResponse } from "@/lib/types";

function handleSetupError(error: unknown) {
  if (error instanceof HttpError) {
    const body: SetupErrorResponse = { error: error.message };
    return NextResponse.json(body, { status: error.status });
  }

  console.error("Unhandled setup error:", error);
  const body: SetupErrorResponse = { error: "Internal server error" };
  return NextResponse.json(body, { status: 500 });
}

export async function POST(request: Request) {
  try {
    if (isDatabaseConfigured()) {
      throw new HttpError(409, "Setup is disabled because DATABASE_URL is already configured");
    }

    const body = await readJsonBody(request, { maxSizeKB: 32 });

    const input = validateSetupRunInput(body);
    const provisioned = await provisionDatabase(input, "setup");

    if (provisioned.usersCount > 0) {
      const conflict: SetupErrorResponse = {
        error: "Users already exist in the selected database",
        needsRecovery: true,
        recoveryEndpoint: "/api/setup/recover",
      };
      return NextResponse.json(conflict, { status: 409 });
    }

    const initialUser = await createInitialUserInDatabase(
      provisioned.databaseUrl,
      input.siteAdmin,
    );

    const response: SetupRunResponse = {
      ok: true,
      generated: buildSetupSummary({
        databaseUrl: provisioned.databaseUrl,
        appRole: provisioned.appRole,
        appPassword: provisioned.appPassword,
        initialUserEmail: initialUser.email,
      }),
    };

    try {
      await writeInstallState({
        mode: "setup",
        initialUserEmail: initialUser.email,
      });
    } catch (stateError) {
      console.warn("Failed to persist install-state:", stateError);
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleSetupError(error);
  }
}
