/* ZERO OS · service worker — app autónoma (instalable + offline).
   Conservador: cache-first solo para estáticos inmutables de Next; el resto
   network-first con respaldo de caché. Nunca cachea APIs externas (Gemini,
   Google, Graph, Firestore): esas siempre van a la red. */
const CACHE = "zero-os-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Solo mismo origen: jamás interceptar llamadas a APIs externas.
  if (url.origin !== self.location.origin) return;

  // Estáticos inmutables de Next: cache-first (rápido y offline).
  if (url.pathname.includes("/_next/static/")) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
      )
    );
    return;
  }

  // Resto (navegación, etc.): network-first, cae a caché si no hay red.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match(req, { ignoreSearch: true })))
  );
});
