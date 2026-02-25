import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import {
  getAcmeRenewalMonitor,
  isAcmeProbeRefreshDue,
  saveAcmeConfig,
} from "@/lib/server/acme";
import { readJsonBody } from "@/lib/server/validators";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} is required`);
  }
  return normalized;
}

export async function POST(request: NextRequest) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await readJsonBody(request, { maxSizeKB: 32 });
    if (!isRecord(body)) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const domain = readString(body.domain, "domain");
    const email = readString(body.email, "email");

    const cfg = await saveAcmeConfig({ domain, email });
    const monitor = getAcmeRenewalMonitor(cfg.expiresAt);

    return NextResponse.json({
      ok: true,
      configured: Boolean(cfg.domain && cfg.email),
      domain: cfg.domain,
      email: cfg.email,
      status: cfg.status,
      stage: cfg.stage,
      expiresAt: cfg.expiresAt,
      lastError: cfg.lastError,
      updatedAt: cfg.updatedAt,
      lastProbeAt: cfg.lastProbeAt,
      renewalState: monitor.state,
      daysUntilExpiry: monitor.daysUntilExpiry,
      renewBeforeDays: monitor.renewBeforeDays,
      renewalMessage: monitor.message,
      probeDue: isAcmeProbeRefreshDue(cfg),
      logs: cfg.logs,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось сохранить ACME-конфигурацию.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
