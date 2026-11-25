/* Koma service worker: caches the app shell so the reader opens with no connection.
   Bump VERSION on every release. */
const VERSION = "koma-v1.2.44";
const DIAG = "koma-diag";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./vendor/jszip.min.js",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

// 1.2.44 (Patrick 26 Nov: 1.2.43 was found on the site but never installed on the phone): each file is saved on its
// own, so one that fails doesn't sink the update (only index.html is required); what happened is kept in the
// "koma-diag" cache for Settings › About; and the new version takes over at once instead of waiting to be offered
// (the page reloads itself, or after the reader is closed). cache: "reload" skips the browser's HTTP cache
// (GitHub Pages allows 10 minutes), so a new version never gets stored with the previous release's files.
self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION), failed = [];
    for (const u of SHELL) {
      try {
        const r = await fetch(new Request(u, { cache: "reload" }));
        if (!r.ok) throw new Error("HTTP " + r.status);
        await c.put(u, r);
      } catch (err) {
        const why = err && err.message ? (err.name && err.name !== "Error" ? err.name + ": " : "") + err.message : String(err);
        failed.push(`${u.replace("./", "") || "/"} (${why})`);
      }
    }
    try { await (await caches.open(DIAG)).put("install", new Response(JSON.stringify({ version: VERSION, at: new Date().toISOString(), failed }))); } catch {}
    if (!(await c.match("./index.html"))) throw new Error("index.html could not be saved");
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION && k !== DIAG).map(k => caches.delete(k)));
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
