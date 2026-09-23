self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || "منظومة المبيعات";
  const options = {
    body: data.body || "لديك إشعار جديد",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "sales-dashboard",
    data: { url: data.url || "/" },
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = clients.find((client) => client.url.startsWith(self.location.origin));
    if (existing) {
      await existing.focus();
      if ("navigate" in existing) await existing.navigate(targetUrl);
    } else if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});
