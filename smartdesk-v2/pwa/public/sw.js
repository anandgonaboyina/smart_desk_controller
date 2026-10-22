/**
 * sw.js — Hand-written Offline Service Worker for SmartDesk V2 PWA
 *
 * Purpose : Caches app shell, scripts, images, and routes for 100% offline functionality.
 * Depends : Service Worker API, Cache Storage API.
 * Used by : layout.tsx / registerServiceWorker.
 */

const CACHE_NAME = "smartdesk-v2-cache-v1";

const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
  "/SmartDesk logo.png",
  "/icon.png",
];

// Install: Pre-cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Pre-cache warning:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Claim clients & purge obsolete caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Offline-first with network fallback & dynamic cache update
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET requests or chrome-extension URLs
  if (req.method !== "GET" || !url.protocol.startsWith("http")) return;

  // Navigation requests (HTML pages): Network-first with immediate cache fallback for offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/", resClone));
          }
          return networkRes;
        })
        .catch(async () => {
          // Completely offline: serve cached root app shell
          const cached = await caches.match("/");
          if (cached) return cached;
          return caches.match(req);
        })
    );
    return;
  }

  // Static assets (Next.js chunks, images, fonts, styles): Cache-first with background network refresh
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      if (cachedRes) {
        // Fetch in background to update cache for next time
        fetch(req).then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, networkRes));
          }
        }).catch(() => {});
        return cachedRes;
      }

      // If not in cache, fetch from network and store in cache
      return fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      }).catch(async (fetchErr) => {
        // Fallback for image requests or generic files when offline
        if (req.destination === "image") {
          return caches.match("/SmartDesk logo.png");
        }
        throw fetchErr;
      });
    })
  );
});

