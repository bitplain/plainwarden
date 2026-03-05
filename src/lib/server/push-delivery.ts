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
}

export interface PushSendResult {
  sent: number;
  failed: number;
  inactive: number;
  transientFailed: number;
  permanentFailed: number;
  hasActiveSubscriptions: boolean;
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

export async function sendPushToUser(input: {
  userId: string;
  payload: PushMessagePayload;
}): Promise<PushSendResult> {
  await ensureWebPushConfigured();

  const subscriptions = await listActivePushSubscriptionsByUser(input.userId);
  if (subscriptions.length === 0) {
    return {
      sent: 0,
      failed: 0,
      inactive: 0,
      transientFailed: 0,
      permanentFailed: 0,
      hasActiveSubscriptions: false,
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
  });

  let sent = 0;
  let failed = 0;
  let inactive = 0;
  let transientFailed = 0;
  let permanentFailed = 0;

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
    } catch (error) {
      failed += 1;
      const disableNow = isPermanentPushError(error);
      if (disableNow) {
        inactive += 1;
        permanentFailed += 1;
      } else {
        transientFailed += 1;
      }
      await markPushSubscriptionFailure({ id: subscription.id, disableNow });
    }
  }

  return {
    sent,
    failed,
    inactive,
    transientFailed,
    permanentFailed,
    hasActiveSubscriptions: true,
  };
}
