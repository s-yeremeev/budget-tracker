// Service worker — встановлюваність PWA і офлайн-копія останніх відкритих сторінок.
//
// Перехоплюємо ЛИШЕ переходи на сторінки (navigate GET). Усе інше браузер робить сам:
// - /_next/static/* — файли з хешем у назві та `Cache-Control: immutable`: браузер і так
//   тримає їх у своєму кеші. Копія в Cache Storage їх лише дублювала, перезаписувалась
//   на кожному завантаженні й ніколи не чистилась (файли старих деплоїв накопичувались);
// - дані сторінок (RSC, `?_rsc=…`) — майже щоразу новий URL, тож кожна копія була сміттям.
//   Офлайн Next сам переходить на звичайне завантаження сторінки, а його бере кеш нижче;
// - POST (server actions) — їх ніколи не кешували.
//
// Navigation preload: браузер шле запит сторінки одночасно з пробудженням SW, а не
// після нього — швидше відкриття застосунку з іконки на телефоні.
const CACHE = "budget-tracker-v2"; // нова назва: при активації v1 з усім накопиченим видаляється
const MAX_PAGES = 30; // офлайн-копій сторінок; найдавніше відкриті видаляються

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

/** Зберігає офлайн-копію сторінки; повторне збереження робить її «найновішою». */
async function remember(req, res) {
  const cache = await caches.open(CACHE);
  await cache.put(req, res);
  const keys = await cache.keys(); // у порядку збереження
  const extra = keys.length - MAX_PAGES;
  if (extra > 0) await Promise.all(keys.slice(0, extra).map((k) => cache.delete(k)));
}

// Network-first для сторінок: завжди свіжі дані, кеш — лише офлайн-фолбек.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate" || req.method !== "GET") return;

  event.respondWith(
    (async () => {
      try {
        const res = (await event.preloadResponse) || (await fetch(req));
        if (res.status === 200 && res.type === "basic") event.waitUntil(remember(req, res.clone()));
        return res;
      } catch {
        // Офлайн: ця сторінка з кешу, інакше — дашборд, інакше — помилка мережі.
        const cached = (await caches.match(req)) || (await caches.match("/dashboard"));
        return cached || Response.error();
      }
    })(),
  );
});
