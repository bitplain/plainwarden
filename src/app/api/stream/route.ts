import { NextRequest } from "next/server";
import { AgentCore } from "@/agent/AgentCore";
import { createSSEStream, sseHeaders, streamTextChunks } from "@/agent/streaming";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { getOpenRouterRuntimeConfig } from "@/lib/server/openrouter-settings";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";
import { toSerializedError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
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

    const timezone = request.headers.get("x-netden-timezone")?.trim() || "UTC";
    const llm = await getOpenRouterRuntimeConfig(user.id);

    const core = new AgentCore({
      user: {
        userId: user.id,
        userName: user.name,
        userRole: input.settings.role,
        timezone,
        nowIso: new Date().toISOString(),
        workspaceId: "default",
      },
      llm: {
        openrouterApiKey: llm.apiKey,
        openrouterModel: llm.model,
      },
    });

    const turn = await core.runTurn(input);

    const events = [
      ...streamTextChunks(turn.text),
      ...(turn.pendingAction ? [{ type: "action", payload: turn.pendingAction } as const] : []),
      ...(turn.navigateTo ? [{ type: "navigate", payload: { path: turn.navigateTo } } as const] : []),
      { type: "done" } as const,
    ];

    return new Response(createSSEStream(events), {
      status: 200,
      headers: sseHeaders(),
    });
  } catch (error) {
    const serialized = toSerializedError(error);
    logger.error("agent_stream_route_error", {
      status: serialized.status,
      message: serialized.message,
      code: serialized.code,
    });
    return handleRouteError(error);
  }
}
