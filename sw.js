/**
 * Delights Flow — Compact Cache-First Service Worker
 * - Same-origin app shell (index.html, shop.html, manifest.json): Stale-While-Revalidate (0ms open + background refresh)
 * - Static CDNs (Firebase SDK, Tailwind CSS, Chart.js, Inter Fonts): URL-keyed Cache-First with clean redirect handling
 * - Firebase Auth & Firestore APIs: Untouched (direct live connection)
 */

const APP_CACHE = 'delights-flow-app';
const RUNTIME_CACHE = 'delights-flow-runtime';
const ACTIVE_CACHES = [APP_CACHE, RUNTIME_CACHE];
const SHELL_ASSETS = ['./', './index.html', './shop.html', './manifest.json'];

function getStaticCdnRule(url) {
  if (url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) return { ok: true, immutable: true };
  if (url.origin === 'https://cdn.jsdelivr.net' && url.pathname.startsWith('/npm/chart.js@')) return { ok: true, immutable: true };
  if (url.origin === 'https://fonts.gstatic.com') return { ok: true, immutable: true };
  if (url.origin === 'https://cdn.tailwindcss.com') return { ok: true, immutable: false };
  if (url.origin === 'https://fonts.googleapis.com') return { ok: true, immutable: false };
  return { ok: false, immutable: false };
}

/**
 * Normalize responses for Cache API storage (handles Tailwind 302 redirects & opaque responses safely).
 */
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
      if (path.endsWith('shop.html')) return (await cache.match('./shop.html')) || (await cache.match('./index.html'));
      return await cache.match('./index.html');
    }
  } catch {}
  return null;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) =>
      Promise.allSettled(
        SHELL_ASSETS.map(async (asset) => {
          const res = await fetch(asset, { cache: 'no-cache' });
          const clean = await toCacheable(res);
          if (clean) await cache.put(asset, clean);
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

  // 1. Same-origin app shell (Stale-While-Revalidate)
  if (url.origin === location.origin) {
    const cleanKey = `${url.origin}${url.pathname}`;
    const refresh = fetch(req, { cache: 'no-cache' }).then(async (res) => {
      try {
        const clean = await toCacheable(res);
        if (clean && res.type === 'basic') {
          const cache = await caches.open(APP_CACHE);
          await cache.put(cleanKey, clean);
        }
      } catch {}
      return res;
    });

    event.waitUntil(refresh.catch(() => {}));
    event.respondWith((async () => {
      const cached = await matchShell(req);
      if (cached) return cached;
      try { return await refresh; }
      catch {
        return (await matchShell(req)) || new Response('Offline — reconnect once to load Delights Flow.', { status: 503 });
      }
    })());
    return;
  }

  // 2. Static CDN libraries & fonts (URL-keyed Cache-First shared across index.html & shop.html)
  const cdn = getStaticCdnRule(url);
  if (!cdn.ok) return;

  const cacheKey = url.href;
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = (await cache.match(cacheKey)) || (await cache.match(req, { ignoreVary: true }));

    const fetchAndStore = fetch(req).then(async (res) => {
      try {
        const clean = await toCacheable(res);
        if (clean) await cache.put(cacheKey, clean);
      } catch {}
      return res;
    });

    if (cached) {
      if (!cdn.immutable) event.waitUntil(fetchAndStore.catch(() => {}));
      return cached;
    }

    try { return await fetchAndStore; }
    catch { return new Response('', { status: 504 }); }
  })());
});