import { NextResponse } from "next/server";
import { HttpError, readJsonBody } from "@/lib/server/validators";
import { writeInstallState } from "@/modules/setup/install-state";
import {
  buildSetupSummary,
  handleSetupError,
  provisionDatabase,
  resetUserPasswordInDatabase,
  validateSetupRecoverInput,
} from "@/lib/server/setup";
import { SetupRecoverResponse } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request, { maxSizeKB: 32 });

    const input = validateSetupRecoverInput(body);
    const provisioned = await provisionDatabase(input, "recovery");

    if (provisioned.usersCount === 0) {
      throw new HttpError(
        409,
        "Recovery requires an existing NetDen user in the selected database",
      );
    }

    let recoveredUserEmail: string | undefined;
    if (input.accountRecovery) {
      const recoveredUser = await resetUserPasswordInDatabase(
        provisioned.databaseUrl,
        input.accountRecovery,
      );
      recoveredUserEmail = recoveredUser.email;
    }

    const response: SetupRecoverResponse = {
      ok: true,
      recovered: buildSetupSummary({
        databaseUrl: provisioned.databaseUrl,
        appRole: provisioned.appRole,
        appPassword: provisioned.appPassword,
        initialUserEmail: recoveredUserEmail,
      }),
    };

    try {
      await writeInstallState({
        mode: "recovery",
        initialUserEmail: recoveredUserEmail,
      });
    } catch (stateError) {
      console.warn("Failed to persist install-state:", stateError);
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleSetupError(error);
  }
}
