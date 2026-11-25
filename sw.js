const SHELL_CACHE = 'delights-flow-shell';
const CDN_CACHE = 'delights-flow-cdn';
const ACTIVE_CACHES = [SHELL_CACHE, CDN_CACHE];
const SHELL_ASSETS = ['./', './index.html', './core.js', './money.js', './shop.js', './shop.html', './manifest.json'];
const REFRESH_COOLDOWN_MS = 30000;
const REFRESH_DELAY_MS = 3000;
const lastRefresh = new Map();

function isStaticCdn(url) {
  return (
    (url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) ||
    (url.origin === 'https://cdn.jsdelivr.net' && url.pathname.startsWith('/npm/chart.js@')) ||
    url.origin === 'https://cdn.tailwindcss.com' ||
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com'
  );
}

async function toCacheable(res) {
  if (!res) return null;
  if (res.type === 'opaque') return res.clone();
  if (!res.ok) return null;
  if (!res.redirected) return res.clone();
  const buf = await res.clone().arrayBuffer();
  return new Response(buf, { status: res.status, statusText: res.statusText, headers: res.headers });
}

async function matchShell(req) {
  try {
    const cache = await caches.open(SHELL_CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') return (await cache.match('./index.html')) || (await cache.match('./'));
  } catch {}
  return null;
}

function scheduleRefresh(cleanUrl) {
  const now = Date.now();
  if (now - (lastRefresh.get(cleanUrl) || 0) < REFRESH_COOLDOWN_MS) return Promise.resolve();
  lastRefresh.set(cleanUrl, now);
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        const res = await fetch(cleanUrl, { cache: 'no-cache' });
        const clean = await toCacheable(res);
        if (clean && res.type === 'basic') {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put(cleanUrl, clean);
        }
      } catch {}
      resolve();
    }, REFRESH_DELAY_MS);
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.allSettled(
        SHELL_ASSETS.map(async (asset) => {
          const resolved = new URL(asset, self.location.href).href;
          const res = await fetch(resolved, { cache: 'no-cache' });
          const clean = await toCacheable(res);
          if (clean) await cache.put(resolved, clean);
        })
      )
    ).finally(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !ACTIVE_CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    const cleanUrl = `${url.origin}${url.pathname}`;
    let doneBg;
    const bgPromise = new Promise((r) => { doneBg = r; });
    event.waitUntil(bgPromise);

    event.respondWith((async () => {
      try {
        const cached = await matchShell(req);
        if (cached) {
          scheduleRefresh(cleanUrl).finally(doneBg);
          return cached;
        }
        const res = await fetch(cleanUrl, { cache: 'no-cache' });
        const clean = await toCacheable(res);
        if (clean && res.type === 'basic') {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put(cleanUrl, clean.clone());
          doneBg();
          return clean;
        }
        doneBg();
        return res;
      } catch {
        doneBg();
        return (await matchShell(req)) || new Response('Offline — reconnect once to load Delights Flow.', { status: 503 });
      }
    })());
    return;
  }

  if (!isStaticCdn(url)) return;
  const key = url.href;
  event.respondWith((async () => {
    try {
      const cache = await caches.open(CDN_CACHE);
      const cached = (await cache.match(key)) || (await cache.match(req, { ignoreVary: true }));
      if (cached) return cached;
      const res = await fetch(req);
      const clean = await toCacheable(res);
      if (clean) { await cache.put(key, clean.clone()); return clean; }
      return res;
    } catch { return new Response('', { status: 504 }); }
  })());
});
