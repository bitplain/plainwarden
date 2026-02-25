import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import {
  emptyAcmeConfig,
  getAcmeRenewalMonitor,
  isAcmeProbeRefreshDue,
  refreshAcmeCertificateStatus,
} from "@/lib/server/acme";

export async function GET(request: NextRequest) {
  try {
    await bootstrapAuth();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const cfg = await refreshAcmeCertificateStatus();
    const safeCfg = cfg ?? emptyAcmeConfig();
    const monitor = getAcmeRenewalMonitor(safeCfg.expiresAt);

    return NextResponse.json({
      ok: true,
      configured: Boolean(safeCfg.domain && safeCfg.email),
      domain: safeCfg.domain,
      email: safeCfg.email,
      status: safeCfg.status,
      stage: safeCfg.stage,
      expiresAt: safeCfg.expiresAt,
      lastError: safeCfg.lastError,
      updatedAt: safeCfg.updatedAt,
      lastProbeAt: safeCfg.lastProbeAt,
      renewalState: monitor.state,
      daysUntilExpiry: monitor.daysUntilExpiry,
      renewBeforeDays: monitor.renewBeforeDays,
      renewalMessage: monitor.message,
      probeDue: isAcmeProbeRefreshDue(safeCfg),
      logs: safeCfg.logs,
    });
  } catch {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
