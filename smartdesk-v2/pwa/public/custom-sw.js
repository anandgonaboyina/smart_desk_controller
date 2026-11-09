/**
 * custom-sw.js — Custom Push Notification Worker for SmartDesk V2 PWA
 *
 * Purpose : Handles background Web Push events for SmartDesk.
 *           Specifically monitors presence state and triggers a push notification
 *           when presence goes away and comes back, ONLY if payload.enabled is true.
 * Depends : Web Push API, Service Worker API, Notification API
 * Used by : Registered service worker via withPWA / importScripts
 */

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload = null;
  try {
    payload = event.data.json();
  } catch (err) {
    try {
      payload = JSON.parse(event.data.text());
    } catch (_) {
      return;
    }
  }

  // Strictly enforce: ONLY proceed if payload exists and 'enabled' is boolean true
  if (!payload || payload.enabled !== true) {
    return;
  }

  // Trigger notification specifically when "presence goes away and comes back"
  // Supports presence return / arrival state transitions or explicit event identifiers
  const isPresenceReturn =
    payload.type === "presence_return" ||
    payload.type === "presence_arrival" ||
    payload.type === "presence_back" ||
    payload.event === "presence_return" ||
    payload.event === "presence_arrival" ||
    payload.event === "presence_back" ||
    payload.action === "presence_return" ||
    payload.action === "presence_back" ||
    payload.presence === "returned" ||
    payload.presence === "back" ||
    payload.presence === "present" ||
    (payload.state === "present" && (payload.previousState === "away" || payload.wasAway === true)) ||
    (payload.presenceState === "present" && (payload.previousPresenceState === "away" || payload.wasAway === true)) ||
    (typeof payload.message === "string" && /presence.*(back|return|arrive)/i.test(payload.message)) ||
    (typeof payload.body === "string" && /presence.*(back|return|arrive)/i.test(payload.body)) ||
    (typeof payload.title === "string" && /presence.*(back|return|arrive)/i.test(payload.title));

  if (!isPresenceReturn) {
    return;
  }

  const title = payload.title || "SmartDesk: Presence Restored";
  const notificationOptions = {
    body:
      payload.body ||
      payload.message ||
      "Welcome back! Presence detected after being away from your SmartDesk.",
    icon: payload.icon || "/icon-512x512.png",
    badge: payload.badge || "/icon-512x512.png",
    tag: "smartdesk-presence-return",
    renotify: true,
    data: payload.data || { url: "/" },
  };

  event.waitUntil(self.registration.showNotification(title, notificationOptions));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(event.notification.data?.url || "/");
        }
      })
  );
});
