import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/server/auth";
import { sendPushToUser } from "@/lib/server/push-delivery";
import { updatePushReceiptForUser } from "@/lib/server/push-receipts-db";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }

    const body = await readJsonBody(request, { maxSizeKB: 8 });
    if (!isRecord(body)) {
      throw new HttpError(400, "Invalid payload");
    }

    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "NetDen Reminder";
    const message = typeof body.message === "string" && body.message.trim() ? body.message.trim() : "Test push";
    const navigateTo = typeof body.navigateTo === "string" ? body.navigateTo : "/";
    const verifyToken = typeof body.verifyToken === "string" ? body.verifyToken.trim() : "";
    if (verifyToken && !/^[A-Za-z0-9-]{8,128}$/.test(verifyToken)) {
      throw new HttpError(400, "verifyToken is invalid");
    }

    const sent = await sendPushToUser({
      userId: userId,
      payload: {
        title,
        body: message,
        navigateTo,
        tag: verifyToken ? `push-verify:${verifyToken}` : undefined,
        verifyToken: verifyToken || undefined,
      },
    });

    if (verifyToken && sent.sent > 0) {
      await updatePushReceiptForUser({
        userId,
        token: verifyToken,
        phase: "sent",
        userAgent: request.headers.get("user-agent")?.trim() ?? undefined,
      });
    }

    return NextResponse.json({
      ok: true,
      sent,
      verifyToken: verifyToken || null,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
