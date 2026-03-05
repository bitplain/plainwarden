"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createRandomId } from "@/lib/random-id";

interface PushDiagnostics {
  configured: boolean;
  missing: string[];
  invalid: string[];
  cronConfigured: boolean;
  source: "env" | "stored" | "none";
  browserIssue: "none" | "unsupported" | "insecure-context" | "service-worker-error";
  browserMessage: string | null;
  isLoading: boolean;
  error: string | null;
}

interface PushDeliveryReceipt {
  version: 1;
  userId: string;
  token: string;
  sentAt?: string;
  receivedAt?: string;
  shownAt?: string;
  userAgent?: string;
  updatedAt: string;
}

interface PushVerificationState {
  status: "idle" | "pending" | "received" | "shown" | "timeout" | "error";
  token: string | null;
  checkedAt?: string;
  receipt?: PushDeliveryReceipt | null;
  message?: string;
}

interface UsePushNotificationsResult {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isBusy: boolean;
  diagnostics: PushDiagnostics;
  verification: PushVerificationState;
  subscribe: () => Promise<{ ok: boolean; message: string }>;
  unsubscribe: () => Promise<{ ok: boolean; message: string }>;
  sendTest: (
    message: string,
    options?: { verifyToken?: string; navigateTo?: string },
  ) => Promise<{ ok: boolean; message: string }>;
  verifyDelivery: () => Promise<{ ok: boolean; message: string; receipt?: PushDeliveryReceipt | null }>;
  recheck: () => Promise<void>;
  autoSetup: () => Promise<{ ok: boolean; message: string; cronSecret: string | null }>;
}

interface PushStatusResponse {
  supported?: boolean;
  configured?: boolean;
  missing?: string[];
  invalid?: string[];
  vapidPublicKey?: string;
  cronConfigured?: boolean;
  source?: "env" | "stored" | "none";
}

interface PushAutoSetupResponse {
  ok?: boolean;
  generatedPushConfig?: boolean;
  generatedCronSecret?: boolean;
  cronSecret?: string | null;
}

interface PushTestResponse {
  ok?: boolean;
  verifyToken?: string | null;
  deliveryStatus?: "delivered" | "partial-delivery" | "send-failed" | "no-active-subscriptions";
  reason?: string;
  retryRecommended?: boolean;
  sent?: {
    sent?: number;
    failed?: number;
    inactive?: number;
    transientFailed?: number;
    permanentFailed?: number;
    hasActiveSubscriptions?: boolean;
  };
}

interface PushReceiptResponse {
  ok?: boolean;
  receipt?: PushDeliveryReceipt | null;
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

const EMPTY_DIAGNOSTICS: PushDiagnostics = {
  configured: false,
  missing: [],
  invalid: [],
  cronConfigured: false,
  source: "none",
  browserIssue: "none",
  browserMessage: null,
  isLoading: true,
  error: null,
};

const EMPTY_VERIFICATION: PushVerificationState = {
  status: "idle",
  token: null,
};

function toDiagnosticsErrorMessage(diagnostics: Pick<PushDiagnostics, "missing" | "invalid">): string {
  const parts: string[] = [];
  if (diagnostics.missing.length > 0) {
    parts.push(`missing: ${diagnostics.missing.join(", ")}`);
  }
  if (diagnostics.invalid.length > 0) {
    parts.push(`invalid: ${diagnostics.invalid.join(", ")}`);
  }
  if (parts.length === 0) {
    return "Push server is not configured";
  }
  return `Push server is not configured (${parts.join("; ")})`;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function toBrowserSupportMessage(issue: PushDiagnostics["browserIssue"]): string {
  if (issue === "insecure-context") {
    return "Push работает только в защищенном контексте (HTTPS или localhost).";
  }
  if (issue === "unsupported") {
    return "Push API или Service Worker не поддерживаются в этом браузере.";
  }
  if (issue === "service-worker-error") {
    return "Не удалось зарегистрировать service worker для push.";
  }
  return "Push не поддерживается в этом браузере.";
}

function toDeliveryErrorMessage(response: PushTestResponse): string {
  if (response.deliveryStatus === "no-active-subscriptions") {
    return "Нет активных подписок браузера. Выполните Enable push ещё раз.";
  }
  if (response.deliveryStatus === "send-failed") {
    if (response.reason === "permanent-failure") {
      return "Доставка push не удалась: подписка недействительна. Переподключите push.";
    }
    if (response.reason === "transient-failure") {
      return "Доставка push временно недоступна. Повторите попытку позже.";
    }
    return response.retryRecommended
      ? "Доставка push не удалась (временная ошибка). Повторите попытку."
      : "Доставка push не удалась.";
  }
  return "Push отправлен, но подтверждения доставки нет.";
}

async function ensureServiceWorkerRegistration() {
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  await navigator.serviceWorker.ready;
  return registration;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [runtimeVapidPublicKey, setRuntimeVapidPublicKey] = useState("");
  const [diagnostics, setDiagnostics] = useState<PushDiagnostics>(EMPTY_DIAGNOSTICS);
  const [verification, setVerification] = useState<PushVerificationState>(EMPTY_VERIFICATION);

  const refreshBrowserState = useCallback(async () => {
    if (!window.isSecureContext) {
      setSupported(false);
      setPermission("unsupported");
      setIsSubscribed(false);
      setDiagnostics((prev) => ({
        ...prev,
        browserIssue: "insecure-context",
        browserMessage: toBrowserSupportMessage("insecure-context"),
      }));
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setSupported(false);
      setPermission("unsupported");
      setIsSubscribed(false);
      setDiagnostics((prev) => ({
        ...prev,
        browserIssue: "unsupported",
        browserMessage: toBrowserSupportMessage("unsupported"),
      }));
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);

    try {
      const registration = await ensureServiceWorkerRegistration();

      const existing = await registration.pushManager.getSubscription();
      setIsSubscribed(Boolean(existing));
      setDiagnostics((prev) => ({
        ...prev,
        browserIssue: "none",
        browserMessage: null,
      }));
    } catch {
      setSupported(false);
      setPermission("unsupported");
      setIsSubscribed(false);
      setDiagnostics((prev) => ({
        ...prev,
        browserIssue: "service-worker-error",
        browserMessage: toBrowserSupportMessage("service-worker-error"),
      }));
    }
  }, []);

  const loadServerDiagnostics = useCallback(async () => {
    setDiagnostics((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await fetch("/api/push/status", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as PushStatusResponse | null;
      if (!response.ok || !payload) {
        throw new Error(`HTTP ${response.status}`);
      }

      const configured = payload.configured ?? payload.supported ?? false;
      const missing = Array.isArray(payload.missing) ? payload.missing : [];
      const invalid = Array.isArray(payload.invalid) ? payload.invalid : [];
      const vapidPublicKey =
        typeof payload.vapidPublicKey === "string" ? payload.vapidPublicKey.trim() : "";
      const cronConfigured = Boolean(payload.cronConfigured);
      const source =
        payload.source === "env" || payload.source === "stored" || payload.source === "none"
          ? payload.source
          : "none";

      setRuntimeVapidPublicKey(vapidPublicKey);
      setDiagnostics((prev) => ({
        ...prev,
        configured,
        missing,
        invalid,
        cronConfigured,
        source,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      setRuntimeVapidPublicKey("");
      setDiagnostics((prev) => ({
        ...prev,
        configured: false,
        missing: [],
        invalid: [],
        cronConfigured: false,
        source: "none",
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load push diagnostics",
      }));
    }
  }, []);

  const recheck = useCallback(async () => {
    await Promise.all([loadServerDiagnostics(), refreshBrowserState()]);
  }, [loadServerDiagnostics, refreshBrowserState]);

  useEffect(() => {
    void recheck();
  }, [recheck]);

  const subscribe = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    if (!supported) {
      return { ok: false, message: diagnostics.browserMessage ?? "Push not supported" };
    }

    if (!diagnostics.configured || !runtimeVapidPublicKey) {
      return { ok: false, message: toDiagnosticsErrorMessage(diagnostics) };
    }

    if (Notification.permission === "denied") {
      setPermission("denied");
      return { ok: false, message: "Permission denied in browser settings" };
    }

    setIsBusy(true);
    try {
      const requested = await Notification.requestPermission();
      setPermission(requested);
      if (requested !== "granted") {
        return { ok: false, message: "Permission denied" };
      }

      const registration = await ensureServiceWorkerRegistration();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(runtimeVapidPublicKey),
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
  }, [supported, diagnostics, runtimeVapidPublicKey]);

  const unsubscribe = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    if (!supported) {
      return { ok: false, message: diagnostics.browserMessage ?? "Push not supported" };
    }

    setIsBusy(true);
    try {
      const registration = await ensureServiceWorkerRegistration();
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
  }, [supported, diagnostics.browserMessage]);

  const sendTest = useCallback(
    async (
      message: string,
      options?: { verifyToken?: string; navigateTo?: string },
    ): Promise<{ ok: boolean; message: string }> => {
      if (!supported) {
        return { ok: false, message: diagnostics.browserMessage ?? "Push not supported" };
      }

      setIsBusy(true);
      try {
        const response = await postJson<PushTestResponse>("/api/push/test", {
          title: "NetDen test",
          message,
          navigateTo: options?.navigateTo ?? "/",
          verifyToken: options?.verifyToken,
        });

        if (response.deliveryStatus === "no-active-subscriptions" || response.deliveryStatus === "send-failed") {
          return { ok: false, message: toDeliveryErrorMessage(response) };
        }

        if (response.deliveryStatus === "partial-delivery") {
          return { ok: true, message: "Push отправлен частично: часть подписок требует переподключения." };
        }

        return { ok: true, message: "Test push sent" };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : "Push test failed" };
      } finally {
        setIsBusy(false);
      }
    },
    [supported, diagnostics.browserMessage],
  );

  const verifyDelivery = useCallback(async () => {
    if (!supported) {
      return { ok: false, message: diagnostics.browserMessage ?? "Push not supported" };
    }

    if (!isSubscribed) {
      return { ok: false, message: "Push is not enabled" };
    }

    const verifyToken = createRandomId().replace(/[^A-Za-z0-9-]/g, "");
    setVerification({ status: "pending", token: verifyToken, checkedAt: new Date().toISOString() });

    setIsBusy(true);
    try {
      const sendResult = await postJson<PushTestResponse>("/api/push/test", {
        title: "Push delivery check",
        message: "Проверка push из Settings",
        navigateTo: "/settings",
        verifyToken,
      });

      if (sendResult.deliveryStatus === "no-active-subscriptions" || sendResult.deliveryStatus === "send-failed") {
        const message = toDeliveryErrorMessage(sendResult);
        setVerification({
          status: "error",
          token: verifyToken,
          checkedAt: new Date().toISOString(),
          message,
        });
        return { ok: false, message };
      }

      const deadline = Date.now() + 20000;
      let lastReceipt: PushDeliveryReceipt | null = null;

      while (Date.now() < deadline) {
        const statusResponse = await fetch(`/api/push/receipt?token=${encodeURIComponent(verifyToken)}`, {
          method: "GET",
          cache: "no-store",
        });

        if (statusResponse.ok) {
          const payload = (await statusResponse.json().catch(() => null)) as PushReceiptResponse | null;
          if (payload?.receipt) {
            lastReceipt = payload.receipt;
            if (payload.receipt.shownAt || payload.receipt.receivedAt) {
              const okMessage = payload.receipt.shownAt
                ? "Push доставлен и показан в браузере"
                : "Push получен браузером";
              setVerification({
                status: payload.receipt.shownAt ? "shown" : "received",
                token: verifyToken,
                checkedAt: new Date().toISOString(),
                receipt: payload.receipt,
                message: okMessage,
              });
              return { ok: true, message: okMessage, receipt: payload.receipt };
            }
          }
        }

        await sleep(1000);
      }

      const timeoutMessage = lastReceipt?.sentAt
        ? "Push отправлен, но браузер не подтвердил получение за 20 секунд"
        : "Push отправлен, но сервер не увидел receipt за 20 секунд";
      setVerification({
        status: "timeout",
        token: verifyToken,
        checkedAt: new Date().toISOString(),
        receipt: lastReceipt,
        message: timeoutMessage,
      });
      return { ok: false, message: timeoutMessage, receipt: lastReceipt };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Push verification failed";
      setVerification({
        status: "error",
        token: verifyToken,
        checkedAt: new Date().toISOString(),
        message,
      });
      return { ok: false, message };
    } finally {
      setIsBusy(false);
    }
  }, [supported, isSubscribed, diagnostics.browserMessage]);

  const autoSetup = useCallback(async (): Promise<{ ok: boolean; message: string; cronSecret: string | null }> => {
    setIsBusy(true);
    try {
      const payload = await postJson<PushAutoSetupResponse>("/api/push/setup", {});
      await recheck();

      if (!payload?.ok) {
        return { ok: false, message: "Auto setup failed", cronSecret: null };
      }

      const notes: string[] = [];
      if (payload.generatedPushConfig) {
        notes.push("VAPID generated");
      }
      if (payload.generatedCronSecret) {
        notes.push("Cron secret generated");
      }

      const message = notes.length > 0 ? notes.join(", ") : "Push config already available";
      return {
        ok: true,
        message,
        cronSecret: typeof payload.cronSecret === "string" ? payload.cronSecret : null,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Auto setup failed",
        cronSecret: null,
      };
    } finally {
      setIsBusy(false);
    }
  }, [recheck]);

  return useMemo(
    () => ({
      supported,
      permission,
      isSubscribed,
      isBusy,
      diagnostics,
      verification,
      subscribe,
      unsubscribe,
      sendTest,
      verifyDelivery,
      recheck,
      autoSetup,
    }),
    [
      supported,
      permission,
      isSubscribed,
      isBusy,
      diagnostics,
      verification,
      subscribe,
      unsubscribe,
      sendTest,
      verifyDelivery,
      recheck,
      autoSetup,
    ],
  );
}
