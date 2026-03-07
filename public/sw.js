function base64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function normalizeBase64Url(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function reportReceipt(verifyToken, phase) {
  if (!verifyToken) {
    return;
  }

  try {
    const response = await fetch("/api/push/receipt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({
        token: verifyToken,
        phase,
      }),
    });
    if (!response.ok) {
      console.warn("[push] receipt report failed", {
        phase,
        status: response.status,
      });
    }
  } catch (error) {
    console.warn("[push] receipt report failed", {
      phase,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function fetchRuntimeVapidPublicKey() {
  try {
    const response = await fetch("/api/push/status", {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || typeof payload.vapidPublicKey !== "string") {
      return "";
    }
    return normalizeBase64Url(payload.vapidPublicKey);
  } catch {
    return "";
  }
}

async function syncSubscriptionToServer(subscriptionJson) {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      subscription: subscriptionJson,
    }),
  });

  if (!response.ok) {
    throw new Error(`Push subscription sync failed with HTTP ${response.status}`);
  }
}

async function disableOldSubscription(endpoint) {
  if (!endpoint) return;
  try {
    const response = await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        endpoint,
      }),
    });

    if (!response.ok && response.status !== 404) {
      console.warn("[push] old subscription disable failed", {
        endpoint,
        status: response.status,
      });
    }
  } catch (error) {
    console.warn("[push] old subscription disable failed", {
      endpoint,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function notifyVisibleClients(data) {
  const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windowClients) {
    client.postMessage({
      type: "netden-push-foreground",
      payload: {
        title: data.title,
        body: data.body,
        navigateTo: data.navigateTo,
        tag: data.tag,
      },
    });
  }
}

self.addEventListener("push", (event) => {
  if (!(self.Notification && self.Notification.permission === "granted")) {
    return;
  }

  let data = {
    title: "NetDen",
    body: "New reminder",
    icon: "/globe.svg",
    badge: "/globe.svg",
    navigateTo: "/",
    tag: "netden-reminder",
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      // Fallback to defaults.
    }
  }

  const verifyToken = typeof data.verifyToken === "string" ? data.verifyToken.trim() : "";

  event.waitUntil(
    (async () => {
      await reportReceipt(verifyToken, "received");
      await notifyVisibleClients(data);

      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || "/globe.svg",
        badge: data.badge || "/globe.svg",
        tag: data.tag,
        renotify: data.renotify === true,
        requireInteraction: data.requireInteraction === true,
        data: {
          navigateTo: data.navigateTo,
        },
      });

      await reportReceipt(verifyToken, "shown");
    })(),
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const oldEndpoint = event.oldSubscription?.endpoint;
        const registration = self.registration;
        const runtimeVapidPublicKey = await fetchRuntimeVapidPublicKey();
        if (!runtimeVapidPublicKey) {
          return;
        }

        const nextSubscription =
          event.newSubscription ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64ToUint8Array(runtimeVapidPublicKey),
          }));

        await syncSubscriptionToServer(nextSubscription.toJSON());
        await disableOldSubscription(oldEndpoint);
      } catch (error) {
        console.error("[push] subscription change sync failed", error);
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const navigateTo = event.notification.data?.navigateTo || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(navigateTo);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(navigateTo);
      }

      return undefined;
    }),
  );
});
