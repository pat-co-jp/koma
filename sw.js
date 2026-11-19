/* Koma service worker: caches the app shell so the reader opens with no connection.
   Bump VERSION on every release; the page offers a reload when a new version is ready. */
const VERSION = "koma-v1.2.27";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./vendor/jszip.min.js",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  // cache: "reload" skips the browser's HTTP cache (GitHub Pages allows 10 minutes), so a new version
  // never gets stored with the previous release's files.
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))));
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Network-only for everything off this origin: repository catalogues, covers, volumes and packs
  // always come live from the host and are never cached here.
  if (url.origin !== self.location.origin) return;
  // Navigations: cached shell first, so the app opens offline.
  if (req.mode === "navigate") {
    e.respondWith(caches.match("./index.html").then(r => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
});
