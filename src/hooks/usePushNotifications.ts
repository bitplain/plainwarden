"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface UsePushNotificationsResult {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isBusy: boolean;
  subscribe: () => Promise<{ ok: boolean; message: string }>;
  unsubscribe: () => Promise<{ ok: boolean; message: string }>;
  sendTest: (message: string) => Promise<{ ok: boolean; message: string }>;
}

function base64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as T | { message?: string } | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setSupported(false);
      setPermission("unsupported");
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);

    const init = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        const existing = await registration.pushManager.getSubscription();
        setIsSubscribed(Boolean(existing));
      } catch {
        setSupported(false);
        setPermission("unsupported");
      }
    };

    void init();
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) {
      return { ok: false, message: "Push not supported" };
    }

    if (!vapidPublicKey) {
      return { ok: false, message: "VAPID public key is missing" };
    }

    setIsBusy(true);
    try {
      const requested = await Notification.requestPermission();
      setPermission(requested);
      if (requested !== "granted") {
        return { ok: false, message: "Permission denied" };
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(vapidPublicKey),
      });

      await postJson<{ ok: boolean; id: string }>("/api/push/subscribe", {
        subscription: subscription.toJSON(),
      });

      setIsSubscribed(true);
      return { ok: true, message: "Push enabled" };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Subscribe failed" };
    } finally {
      setIsBusy(false);
    }
  }, [supported, vapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    if (!supported) {
      return { ok: false, message: "Push not supported" };
    }

    setIsBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await postJson<{ ok: boolean }>("/api/push/unsubscribe", {
          endpoint: subscription.endpoint,
        });
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      return { ok: true, message: "Push disabled" };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unsubscribe failed" };
    } finally {
      setIsBusy(false);
    }
  }, [supported]);

  const sendTest = useCallback(async (message: string) => {
    if (!supported) {
      return { ok: false, message: "Push not supported" };
    }

    setIsBusy(true);
    try {
      await postJson<{ ok: boolean }>("/api/push/test", {
        title: "NetDen test",
        message,
        navigateTo: "/",
      });
      return { ok: true, message: "Test push sent" };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Push test failed" };
    } finally {
      setIsBusy(false);
    }
  }, [supported]);

  return useMemo(
    () => ({
      supported,
      permission,
      isSubscribed,
      isBusy,
      subscribe,
      unsubscribe,
      sendTest,
    }),
    [supported, permission, isSubscribed, isBusy, subscribe, unsubscribe, sendTest],
  );
}
