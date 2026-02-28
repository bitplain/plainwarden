import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";
import { executeTool, getToolDescriptor } from "@/tools";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("x-netden-agent-tools") !== "1") {
      throw new HttpError(403, "Forbidden");
    }

    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const body = await readJsonBody(request, { maxSizeKB: 64 });
    if (!isRecord(body)) {
      throw new HttpError(400, "Invalid payload");
    }

    const toolName = typeof body.toolName === "string" ? body.toolName.trim() : "";
    if (!toolName) {
      throw new HttpError(400, "toolName is required");
    }

    const descriptor = getToolDescriptor(toolName);
    if (!descriptor) {
      throw new HttpError(404, "Tool not found");
    }

    const confirmMutating = body.confirmMutating === true;
    if (descriptor.mutating && !confirmMutating) {
      throw new HttpError(409, "Mutating tool requires explicit confirmMutating=true");
    }

    const args = isRecord(body.args) ? body.args : {};
    const result = await executeTool(toolName, args, {
      userId: user.id,
      nowIso: new Date().toISOString(),
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
