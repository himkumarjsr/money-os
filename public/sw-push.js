/**
 * Standalone push service worker for local/dev when next-pwa is disabled.
 * Production uses next-pwa's sw.js which merges worker/index.js.
 */
/* eslint-disable no-restricted-globals */
self.addEventListener("push", function (event) {
  let data = {
    title: "Finkoin tip",
    body: "Your daily finance tip is ready.",
    url: "/",
    tag: "finkoin-tip",
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = {
        title: parsed.title || data.title,
        body: parsed.body || data.body,
        url: parsed.url || data.url,
        tag: parsed.tag || data.tag,
      };
    }
  } catch (e) {
    try {
      const text = event.data && event.data.text();
      if (text) data.body = text;
    } catch (_) {
      /* ignore */
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      renotify: true,
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const target =
    (event.notification.data && event.notification.data.url) || "/";
  const absolute = new URL(target, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      function (clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (
            client.url.startsWith(self.location.origin) &&
            "focus" in client
          ) {
            client.navigate(absolute);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(absolute);
        }
      },
    ),
  );
});
