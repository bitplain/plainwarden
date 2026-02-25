import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { handleRouteError, HttpError, readJsonBody } from "@/lib/server/validators";
import { resolveAllowlistedCommand } from "@/modules/terminal/shell/allowlist";
import { parseCommandLine } from "@/modules/terminal/shell/parse";
import { runAllowlistedCommand } from "@/modules/terminal/shell/run";

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("x-netden-terminal") !== "1") {
      throw new HttpError(400, "Missing terminal request header");
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const body = await readJsonBody(request, { maxSizeKB: 8 });
    if (!body || typeof body !== "object") {
      throw new HttpError(400, "Invalid payload");
    }

    const lineValue = "line" in body ? (body as Record<string, unknown>).line : undefined;
    if (typeof lineValue !== "string") {
      throw new HttpError(400, "line must be a string");
    }

    const line = lineValue.trim();
    if (!line) {
      throw new HttpError(400, "line is required");
    }

    if (line.length > 200) {
      throw new HttpError(400, "line is too long");
    }

    const parsed = parseCommandLine(line);
    const spec = resolveAllowlistedCommand(parsed);
    if (!spec) {
      throw new HttpError(403, "Command is not in allowlist");
    }

    const result = await runAllowlistedCommand(spec);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return handleRouteError(error);
  }
}
