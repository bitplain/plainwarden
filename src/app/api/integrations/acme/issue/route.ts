import { NextRequest, NextResponse } from "next/server";
import {
  emptyAcmeConfig,
  getAcmeRenewalMonitor,
  isAcmeProbeRefreshDue,
  issueAcmeCertificate,
  readAcmeConfig,
} from "@/lib/server/acme";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";

export async function POST(request: NextRequest) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const cfg = await issueAcmeCertificate();
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
    const latest = (await readAcmeConfig()) ?? emptyAcmeConfig();
    const monitor = getAcmeRenewalMonitor(latest.expiresAt);
    const message = error instanceof Error ? error.message : "Выпуск сертификата завершился ошибкой.";
    return NextResponse.json(
      {
        message,
        configured: Boolean(latest.domain && latest.email),
        domain: latest.domain,
        email: latest.email,
        status: latest.status,
        stage: latest.stage,
        expiresAt: latest.expiresAt,
        lastError: latest.lastError,
        updatedAt: latest.updatedAt,
        lastProbeAt: latest.lastProbeAt,
        renewalState: monitor.state,
        daysUntilExpiry: monitor.daysUntilExpiry,
        renewBeforeDays: monitor.renewBeforeDays,
        renewalMessage: monitor.message,
        probeDue: isAcmeProbeRefreshDue(latest),
        logs: latest.logs,
      },
      { status: 500 },
    );
  }
}
