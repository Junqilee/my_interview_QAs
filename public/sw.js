/* 极简离线 Service Worker：应用壳缓存 + 运行时缓存 */
const CACHE = "interview-trainer-v6";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    // 安装即清空所有旧缓存（无论旧 SW 是否还活着），彻底避免"新旧缓存混用"
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => caches.open(CACHE).then((c) => c.addAll(APP_SHELL)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.url.startsWith("http") === false) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 导航请求：优先网络，失败回退缓存首页（离线可用）
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html").then((r) => r || caches.match("/index.html")))
    );
    return;
  }

  // 静态资源：缓存优先，同时后台更新（stale-while-revalidate）
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
