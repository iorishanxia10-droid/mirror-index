const CACHE = "mirror-index-20260828-4";
const SHELL = ["./", "./index.html", "./styles.css?v=20260828-3", "./data.js?v=20260828-3", "./support-data.js?v=20260828-3", "./support-ranking.js?v=20260828-4", "./app.js?v=20260828-3", "./support.js?v=20260828-4", "./manifest.webmanifest", "./icon.svg", "./og.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok || response.type === "opaque") caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(async () => (await caches.match(event.request)) || (event.request.mode === "navigate" ? caches.match("./index.html") : Response.error())));
});
