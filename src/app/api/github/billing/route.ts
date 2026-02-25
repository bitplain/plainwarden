import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { fetchGitHubBillingUsage } from "@/lib/server/github-billing";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new HttpError(400, `${fieldName} must be a string`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new HttpError(400, `${fieldName} is required`);
  }

  return normalized;
}

function readPositiveInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new HttpError(400, "period values must be positive integers");
  }

  return value;
}

export async function POST(request: NextRequest) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const body = await readJsonBody(request, { maxSizeKB: 32 });
    if (!isRecord(body)) {
      throw new HttpError(400, "Invalid payload");
    }

    const org = readString(body.org, "org");
    const token = readString(body.token, "token");

    let year: number | undefined;
    let month: number | undefined;

    if (body.period !== undefined) {
      if (!isRecord(body.period)) {
        throw new HttpError(400, "period must be an object");
      }

      year = readPositiveInt(body.period.year);
      month = readPositiveInt(body.period.month);

      if (month !== undefined && (month < 1 || month > 12)) {
        throw new HttpError(400, "period.month must be between 1 and 12");
      }
    }

    const result = await fetchGitHubBillingUsage({
      org,
      token,
      period: {
        year,
        month,
      },
    });

    return NextResponse.json({
      copilotPremium: result.aggregate.copilotPremium,
      actions: result.aggregate.actions,
      codespaces: result.aggregate.codespaces,
      raw: {
        hasUsage: result.usage !== null,
        hasSummary: result.summary !== null,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
