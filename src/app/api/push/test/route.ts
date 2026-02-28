import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { sendPushToUser } from "@/lib/server/push-delivery";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: NextRequest) {
  try {
    await bootstrapAuth();
    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const body = await readJsonBody(request, { maxSizeKB: 8 });
    if (!isRecord(body)) {
      throw new HttpError(400, "Invalid payload");
    }

    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "NetDen Reminder";
    const message = typeof body.message === "string" && body.message.trim() ? body.message.trim() : "Test push";
    const navigateTo = typeof body.navigateTo === "string" ? body.navigateTo : "/";

    const sent = await sendPushToUser({
      userId: user.id,
      payload: {
        title,
        body: message,
        navigateTo,
      },
    });

    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    return handleRouteError(error);
  }
}
