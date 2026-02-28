import { NextRequest, NextResponse } from "next/server";
import { AgentCore } from "@/agent/AgentCore";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";
import { parseAgentTurnInput } from "@/utils/validators";

export async function POST(request: NextRequest) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const body = await readJsonBody(request, { maxSizeKB: 128 });
    const input = parseAgentTurnInput(body);

    const core = new AgentCore({
      user: {
        userId: user.id,
        userName: user.name,
        userRole: input.settings.role,
        timezone: request.headers.get("x-netden-timezone")?.trim() || "UTC",
        nowIso: new Date().toISOString(),
        workspaceId: "default",
      },
    });

    const result = await core.runTurn(input);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
