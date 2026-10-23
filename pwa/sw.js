// AMAN WEB HOSTING - service worker (file lives in /pwa but is served at /sw.js, see vercel.json rewrites) (makes the site installable and keeps the page usable offline).
// It never touches /api/ or /s/ (your users' hosted sites), so live data is always fresh.
// Change VERSION whenever you want every phone to download the newest files.
const VERSION = "aman-v5";
const SHELL = ["/", "/css/base.css", "/css/style.css", "/css/host.css", "/css/app.css", "/app.js", "/pwa/manifest.webmanifest", "/pwa/icons/icon-192.png", "/pwa/icons/icon-512.png", "/pwa/icons/badge-96.png", "/favicon.ico"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/s/")) return;

  // opening the app: newest page first, saved copy if there is no internet
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((r) => { const c = r.clone(); caches.open(VERSION).then((x) => x.put("/", c)); return r; })
        .catch(() => caches.match("/").then((r) => r || new Response("You are offline. Open the app again when you have internet.", { status: 503, headers: { "content-type": "text/plain" } })))
    );
    return;
  }

  // css / js: newest file first (so your edits show up right away), saved copy only if offline
  if (/\.(css|js)$/.test(url.pathname)) {
    e.respondWith(
      fetch(req).then((r) => { if (r && r.ok) { const c = r.clone(); caches.open(VERSION).then((x) => x.put(req, c)); } return r; })
        .catch(() => caches.match(req))
    );
    return;
  }

  // css / images / icons: show the saved copy right away, refresh it in the background
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r && r.ok) { const c = r.clone(); caches.open(VERSION).then((x) => x.put(req, c)); } return r; }).catch(() => hit);
      return hit || net;
    })
  );
});

// ---- notifications: always show the AMAN logo ----
const NOTE = { icon: "/pwa/icons/icon-192.png", badge: "/pwa/icons/badge-96.png", image: "/pwa/icons/banner-512.jpg" };

// works for real push messages too (JSON: {title, body, url}) once you add a push server
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "AMAN WEB HOSTING", {
    body: d.body || "", icon: d.icon || NOTE.icon, badge: NOTE.badge, image: d.image || NOTE.image,
    tag: d.tag || "aman-host", data: { url: d.url || "/" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); } }
    return clients.openWindow(url);
  }));
});
