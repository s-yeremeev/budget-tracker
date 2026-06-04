// Мінімальний service worker — для встановлюваності PWA та базового офлайн-фолбеку.
const CACHE = "budget-tracker-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // прибрати старі кеші
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Network-first: завжди свіжі дані, кеш — лише як офлайн-фолбек для GET.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.startsWith("http")) return;

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        // кешуємо успішні відповіді (статика, сторінки)
        if (res && res.status === 200 && res.type === "basic") {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        // офлайн-фолбек для навігації
        if (req.mode === "navigate") {
          const fallback = await caches.match("/dashboard");
          if (fallback) return fallback;
        }
        return Response.error();
      }
    })(),
  );
});
