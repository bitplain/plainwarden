import webpush from "web-push";
import {
  listActivePushSubscriptionsByUser,
  markPushSubscriptionFailure,
  markPushSubscriptionSuccess,
} from "@/lib/server/push-subscriptions-db";
import { getRuntimePushDeliveryConfig } from "@/lib/server/push-runtime-config";

export interface PushMessagePayload {
  title: string;
  body: string;
  navigateTo?: string;
  tag?: string;
  verifyToken?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
}

export interface PushSendResult {
  sent: number;
  failed: number;
  inactive: number;
  transientFailed: number;
  permanentFailed: number;
  hasActiveSubscriptions: boolean;
  deliveryStatus: PushDeliveryStatus;
  reason: PushDeliveryReason;
  retryRecommended: boolean;
}

export type PushFailureClass = "permanent" | "transient";
export type PushDeliveryStatus =
  | "delivered"
  | "partial-delivery"
  | "send-failed"
  | "no-active-subscriptions";
export type PushDeliveryReason =
  | "ok"
  | "mixed-failure"
  | "transient-failure"
  | "permanent-failure"
  | "no-active-subscriptions";

export interface PushErrorClassification {
  failureClass: PushFailureClass;
  reason: string;
  statusCode: number | null;
  retryRecommended: boolean;
}

let isConfigured = false;
let configuredFingerprint = "";

async function ensureWebPushConfigured() {
  const { subject, publicKey, privateKey } = await getRuntimePushDeliveryConfig();
  const nextFingerprint = `${subject}:${publicKey}:${privateKey}`;

  if (isConfigured && configuredFingerprint === nextFingerprint) {
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  isConfigured = true;
  configuredFingerprint = nextFingerprint;
}

function isPermanentPushError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return statusCode === 404 || statusCode === 410;
}

function readStatusCode(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  if (typeof statusCode === "number" && Number.isFinite(statusCode)) {
    return statusCode;
  }
  return null;
}

function endpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "invalid-endpoint";
  }
}

export function classifyPushError(error: unknown): PushErrorClassification {
  const statusCode = readStatusCode(error);
  if (statusCode === 404) {
    return {
      failureClass: "permanent",
      reason: "subscription-not-found",
      statusCode,
      retryRecommended: false,
    };
  }

  if (statusCode === 410) {
    return {
      failureClass: "permanent",
      reason: "subscription-gone",
      statusCode,
      retryRecommended: false,
    };
  }

  if (statusCode === 429) {
    return {
      failureClass: "transient",
      reason: "rate-limited",
      statusCode,
      retryRecommended: true,
    };
  }

  if (typeof statusCode === "number" && statusCode >= 500) {
    return {
      failureClass: "transient",
      reason: "push-service-unavailable",
      statusCode,
      retryRecommended: true,
    };
  }

  return {
    failureClass: "transient",
    reason: "send-failed",
    statusCode,
    retryRecommended: true,
  };
}

export function summarizePushDelivery(input: {
  sent: number;
  failed: number;
  inactive: number;
  transientFailed: number;
  permanentFailed: number;
  hasActiveSubscriptions: boolean;
}): Pick<PushSendResult, "deliveryStatus" | "reason" | "retryRecommended"> {
  if (!input.hasActiveSubscriptions) {
    return {
      deliveryStatus: "no-active-subscriptions",
      reason: "no-active-subscriptions",
      retryRecommended: false,
    };
  }

  if (input.sent > 0 && input.failed === 0) {
    return {
      deliveryStatus: "delivered",
      reason: "ok",
      retryRecommended: false,
    };
  }

  if (input.sent > 0 && input.failed > 0) {
    return {
      deliveryStatus: "partial-delivery",
      reason: "mixed-failure",
      retryRecommended: input.transientFailed > 0,
    };
  }

  if (input.transientFailed > 0 && input.permanentFailed === 0) {
    return {
      deliveryStatus: "send-failed",
      reason: "transient-failure",
      retryRecommended: true,
    };
  }

  if (input.permanentFailed > 0 && input.transientFailed === 0) {
    return {
      deliveryStatus: "send-failed",
      reason: "permanent-failure",
      retryRecommended: false,
    };
  }

  return {
    deliveryStatus: "send-failed",
    reason: "mixed-failure",
    retryRecommended: input.transientFailed > 0,
  };
}

export async function sendPushToUser(input: {
  userId: string;
  payload: PushMessagePayload;
  requestId?: string;
  targetEndpoint?: string;
}): Promise<PushSendResult> {
  await ensureWebPushConfigured();

  const allSubscriptions = await listActivePushSubscriptionsByUser(input.userId);
  const targetEndpoint = input.targetEndpoint?.trim();
  const subscriptions =
    targetEndpoint && targetEndpoint.length > 0
      ? allSubscriptions.filter((item) => item.endpoint === targetEndpoint)
      : allSubscriptions;

  if (subscriptions.length === 0) {
    return {
      sent: 0,
      failed: 0,
      inactive: 0,
      transientFailed: 0,
      permanentFailed: 0,
      hasActiveSubscriptions: false,
      ...summarizePushDelivery({
        sent: 0,
        failed: 0,
        inactive: 0,
        transientFailed: 0,
        permanentFailed: 0,
        hasActiveSubscriptions: false,
      }),
    };
  }

  const payload = JSON.stringify({
    title: input.payload.title,
    body: input.payload.body,
    navigateTo: input.payload.navigateTo,
    icon: "/globe.svg",
    badge: "/globe.svg",
    tag: input.payload.tag,
    verifyToken: input.payload.verifyToken,
    renotify: input.payload.renotify,
    requireInteraction: input.payload.requireInteraction,
  });

  let sent = 0;
  let failed = 0;
  let inactive = 0;
  let transientFailed = 0;
  let permanentFailed = 0;

  console.info("[push] delivery-start", {
    requestId: input.requestId ?? null,
    userId: input.userId,
    subscriptions: subscriptions.length,
    targeted: Boolean(targetEndpoint),
  });

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime?.getTime() ?? null,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload,
        {
          TTL: 60 * 30,
          urgency: "high",
        },
      );

      await markPushSubscriptionSuccess(subscription.id);
      sent += 1;
      console.info("[push] delivery-success", {
        requestId: input.requestId ?? null,
        userId: input.userId,
        subscriptionId: subscription.id,
        endpointHost: endpointHost(subscription.endpoint),
      });
    } catch (error) {
      failed += 1;
      const failure = classifyPushError(error);
      const disableNow = failure.failureClass === "permanent";
      if (disableNow || isPermanentPushError(error)) {
        inactive += 1;
        permanentFailed += 1;
      } else {
        transientFailed += 1;
      }
      await markPushSubscriptionFailure({ id: subscription.id, disableNow });
      console.warn("[push] delivery-failure", {
        requestId: input.requestId ?? null,
        userId: input.userId,
        subscriptionId: subscription.id,
        endpointHost: endpointHost(subscription.endpoint),
        statusCode: failure.statusCode,
        failureClass: failure.failureClass,
        reason: failure.reason,
      });
    }
  }

  const summary = summarizePushDelivery({
    sent,
    failed,
    inactive,
    transientFailed,
    permanentFailed,
    hasActiveSubscriptions: true,
  });

  console.info("[push] delivery-summary", {
    requestId: input.requestId ?? null,
    userId: input.userId,
    sent,
    failed,
    inactive,
    transientFailed,
    permanentFailed,
    deliveryStatus: summary.deliveryStatus,
    reason: summary.reason,
    retryRecommended: summary.retryRecommended,
  });

  return {
    sent,
    failed,
    inactive,
    transientFailed,
    permanentFailed,
    hasActiveSubscriptions: true,
    ...summary,
  };
}
