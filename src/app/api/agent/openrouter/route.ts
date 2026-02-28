import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { OpenRouterApiError } from "@/lib/server/openrouter-client";
import {
  clearOpenRouterKey,
  getOpenRouterUserConfig,
  listOpenRouterModelsForUser,
  saveOpenRouterKey,
  setOpenRouterModel,
} from "@/lib/server/openrouter-settings";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(request: NextRequest) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const config = await getOpenRouterUserConfig(user.id);
    const models =
      config.hasKey && config.status === "valid"
        ? await listOpenRouterModelsForUser(user.id)
        : [];

    return NextResponse.json({
      ok: true,
      config,
      models,
    });
  } catch (error) {
    if (error instanceof OpenRouterApiError && error.status === 401) {
      return NextResponse.json(
        {
          ok: false,
          message: "OpenRouter key is invalid",
        },
        { status: 400 },
      );
    }

    if (error instanceof OpenRouterApiError) {
      return NextResponse.json(
        {
          ok: false,
          message: `OpenRouter request failed (HTTP ${error.status})`,
        },
        { status: 502 },
      );
    }

    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const body = await readJsonBody(request, { maxSizeKB: 32 });
    if (!isRecord(body) || typeof body.action !== "string") {
      throw new HttpError(400, "action is required");
    }

    if (body.action === "save_key") {
      if (typeof body.apiKey !== "string") {
        throw new HttpError(400, "apiKey is required");
      }

      const result = await saveOpenRouterKey(user.id, body.apiKey);
      const models = result.valid ? await listOpenRouterModelsForUser(user.id) : [];

      return NextResponse.json({
        ok: true,
        config: result.config,
        models,
        validation: {
          valid: result.valid,
        },
      });
    }

    if (body.action === "clear_key") {
      const config = await clearOpenRouterKey(user.id);
      return NextResponse.json({
        ok: true,
        config,
        models: [],
      });
    }

    if (body.action === "set_model") {
      if (typeof body.model !== "string") {
        throw new HttpError(400, "model is required");
      }

      const config = await setOpenRouterModel(user.id, body.model);
      return NextResponse.json({
        ok: true,
        config,
      });
    }

    if (body.action === "refresh_models") {
      const models = await listOpenRouterModelsForUser(user.id);
      return NextResponse.json({
        ok: true,
        models,
      });
    }

    throw new HttpError(400, "Unsupported action");
  } catch (error) {
    if (error instanceof OpenRouterApiError && error.status === 401) {
      return NextResponse.json(
        {
          ok: false,
          message: "OpenRouter key is invalid",
        },
        { status: 400 },
      );
    }

    if (error instanceof OpenRouterApiError) {
      return NextResponse.json(
        {
          ok: false,
          message: `OpenRouter request failed (HTTP ${error.status})`,
        },
        { status: 502 },
      );
    }

    if (error instanceof Error && error.message === "OpenRouter key is required") {
      return NextResponse.json(
        {
          ok: false,
          message: "OpenRouter key is not configured",
        },
        { status: 400 },
      );
    }

    return handleRouteError(error);
  }
}
