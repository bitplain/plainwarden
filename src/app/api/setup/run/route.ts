import { NextResponse } from "next/server";
import { HttpError, readJsonBody } from "@/lib/server/validators";
import { writeInstallState } from "@/modules/setup/install-state";
import {
  buildSetupSummary,
  createInitialUserInDatabase,
  handleSetupError,
  isDatabaseConfigured,
  provisionDatabase,
  validateSetupRunInput,
} from "@/lib/server/setup";
import { SetupRunResponse } from "@/lib/types";

export async function POST(request: Request) {
  try {
    if (isDatabaseConfigured()) {
      throw new HttpError(409, "Setup is disabled because DATABASE_URL is already configured");
    }

    const body = await readJsonBody(request, { maxSizeKB: 32 });

    const input = validateSetupRunInput(body);
    const provisioned = await provisionDatabase(input, "setup");

    if (provisioned.usersCount > 0) {
      return NextResponse.json(
        {
          error: "Users already exist in the selected database",
          needsRecovery: true,
          recoveryEndpoint: "/api/setup/recover",
        },
        { status: 409 },
      );
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
