/**
 * Delights Flow — Zero-Network Cache-First Service Worker
 * - Same-origin shell (index.html, shop.html, manifest.json): Instant 0ms cache hit;
 *   quiet background refresh after 2.5s delay + 20s cooldown (never blocks page switches).
 * - Static CDNs (Tailwind CSS, Firebase SDK, Chart.js, Inter Fonts): Strict Cache-First
 *   with ZERO network fetches once cached (matches offline speed while online).
 * - Firebase Auth & Firestore APIs: Untouched (direct live sync).
 */

const APP_CACHE = 'delights-flow-app';
const RUNTIME_CACHE = 'delights-flow-runtime';
const ACTIVE_CACHES = [APP_CACHE, RUNTIME_CACHE];
const SHELL_ASSETS = ['./', './index.html', './shop.html', './manifest.json'];
const SHELL_COOLDOWN_MS = 20000;
const SHELL_DELAY_MS = 2500;
const lastShellCheck = new Map();

function isStaticCdn(url) {
  if (url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) return true;
  if (url.origin === 'https://cdn.jsdelivr.net' && url.pathname.startsWith('/npm/chart.js@')) return true;
  if (url.origin === 'https://fonts.gstatic.com') return true;
  if (url.origin === 'https://cdn.tailwindcss.com') return true;
  if (url.origin === 'https://fonts.googleapis.com') return true;
  return false;
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
    const cache = await caches.open(APP_CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const path = new URL(req.url).pathname;
      if (path.endsWith('shop.html')) {
        return (await cache.match('./shop.html')) || (await cache.match('./index.html'));
      }
      return await cache.match('./index.html');
    }
  } catch {}
  return null;
}

function scheduleShellRefresh(cleanUrl) {
  const now = Date.now();
  if (now - (lastShellCheck.get(cleanUrl) || 0) < SHELL_COOLDOWN_MS) return Promise.resolve();
  lastShellCheck.set(cleanUrl, now);
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        const res = await fetch(cleanUrl, { cache: 'no-cache' });
        const clean = await toCacheable(res);
        if (clean && res.type === 'basic') {
          const cache = await caches.open(APP_CACHE);
          await cache.put(cleanUrl, clean);
        }
      } catch {}
      resolve();
    }, SHELL_DELAY_MS);
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) =>
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

  // 1. Same-origin App Shell: 0ms Cache Hit + Synchronous waitUntil Background Refresh
  if (url.origin === location.origin) {
    const cleanUrl = `${url.origin}${url.pathname}`;
    let resolveBg;
    const bgDone = new Promise((r) => { resolveBg = r; });
    event.waitUntil(bgDone);

    event.respondWith((async () => {
      try {
        const cached = await matchShell(req);
        if (cached) {
          scheduleShellRefresh(cleanUrl).finally(resolveBg);
          return cached;
        }
        const res = await fetch(cleanUrl, { cache: 'no-cache' });
        const clean = await toCacheable(res);
        if (clean && res.type === 'basic') {
          const cache = await caches.open(APP_CACHE);
          await cache.put(cleanUrl, clean.clone());
          resolveBg();
          return clean;
        }
        resolveBg();
        return res;
      } catch {
        resolveBg();
        return (await matchShell(req)) || new Response('Offline — reconnect once to load Delights Flow.', { status: 503 });
      }
    })());
    return;
  }

  // 2. Static CDN libraries & fonts: Strict Cache-First (ZERO network fetch when cached)
  if (!isStaticCdn(url)) return;

  const cacheKey = url.href;
  event.respondWith((async () => {
    try {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = (await cache.match(cacheKey)) || (await cache.match(req, { ignoreVary: true }));
      if (cached) return cached;

      const res = await fetch(req);
      const clean = await toCacheable(res);
      if (clean) {
        await cache.put(cacheKey, clean.clone());
        return clean;
      }
      return res;
    } catch {
      return new Response('', { status: 504 });
    }
  })());
});