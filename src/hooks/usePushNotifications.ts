"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface PushDiagnostics {
  configured: boolean;
  missing: string[];
  invalid: string[];
  cronConfigured: boolean;
  source: "env" | "stored" | "none";
  isLoading: boolean;
  error: string | null;
}

interface UsePushNotificationsResult {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isBusy: boolean;
  diagnostics: PushDiagnostics;
  subscribe: () => Promise<{ ok: boolean; message: string }>;
  unsubscribe: () => Promise<{ ok: boolean; message: string }>;
  sendTest: (message: string) => Promise<{ ok: boolean; message: string }>;
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
  isLoading: true,
  error: null,
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

export function usePushNotifications(): UsePushNotificationsResult {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [runtimeVapidPublicKey, setRuntimeVapidPublicKey] = useState("");
  const [diagnostics, setDiagnostics] = useState<PushDiagnostics>(EMPTY_DIAGNOSTICS);

  const refreshBrowserState = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setSupported(false);
      setPermission("unsupported");
      setIsSubscribed(false);
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);

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
      setIsSubscribed(false);
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
      setDiagnostics({
        configured,
        missing,
        invalid,
        cronConfigured,
        source,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setRuntimeVapidPublicKey("");
      setDiagnostics({
        configured: false,
        missing: [],
        invalid: [],
        cronConfigured: false,
        source: "none",
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load push diagnostics",
      });
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
      return { ok: false, message: "Push not supported" };
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

      const registration = await navigator.serviceWorker.ready;
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

  const sendTest = useCallback(async (message: string): Promise<{ ok: boolean; message: string }> => {
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
      subscribe,
      unsubscribe,
      sendTest,
      recheck,
      autoSetup,
    }),
    [supported, permission, isSubscribed, isBusy, diagnostics, subscribe, unsubscribe, sendTest, recheck, autoSetup],
  );
}
