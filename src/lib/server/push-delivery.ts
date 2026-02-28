import webpush from "web-push";
import {
  listActivePushSubscriptionsByUser,
  markPushSubscriptionFailure,
  markPushSubscriptionSuccess,
} from "@/lib/server/push-subscriptions-db";

export interface PushMessagePayload {
  title: string;
  body: string;
  navigateTo?: string;
  tag?: string;
}

interface PushSendResult {
  sent: number;
  failed: number;
  inactive: number;
}

let isConfigured = false;

function ensureWebPushConfigured() {
  if (isConfigured) return;

  const subject = process.env.VAPID_SUBJECT?.trim();
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();

  if (!subject || !publicKey || !privateKey) {
    throw new Error("Missing VAPID settings");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  isConfigured = true;
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
  ensureWebPushConfigured();

  const subscriptions = await listActivePushSubscriptionsByUser(input.userId);
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, inactive: 0 };
  }

  const payload = JSON.stringify({
    title: input.payload.title,
    body: input.payload.body,
    navigateTo: input.payload.navigateTo,
    icon: "/icon.png",
    badge: "/badge.png",
    tag: input.payload.tag,
  });

  let sent = 0;
  let failed = 0;
  let inactive = 0;

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
      }
      await markPushSubscriptionFailure({ id: subscription.id, disableNow });
    }
  }

  return { sent, failed, inactive };
}
