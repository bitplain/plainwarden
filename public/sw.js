self.addEventListener("push", (event) => {
  if (!event.data) {
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

  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // Fallback to defaults.
  }

  const verifyToken = typeof data.verifyToken === "string" ? data.verifyToken.trim() : "";

  const reportReceipt = async (phase) => {
    if (!verifyToken) {
      return;
    }

    try {
      await fetch("/api/push/receipt", {
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
    } catch {
      // Ignore reporting errors to avoid blocking notification display.
    }
  };

  event.waitUntil(
    (async () => {
      await reportReceipt("received");

      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || "/globe.svg",
        badge: data.badge || "/globe.svg",
        tag: data.tag,
        data: {
          navigateTo: data.navigateTo,
        },
      });

      await reportReceipt("shown");
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
