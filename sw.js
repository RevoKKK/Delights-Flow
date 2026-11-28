/**
 * Delights Flow — Offline-First Auto-Update Service Worker
 * - Same-origin App Shell (index.html, core.js, money.js, shop.js, manifest.json, shop.html):
 *   Instant 0ms Cache-First response + atomic background diff check.
 *   Updates are committed ONLY when every shell asset downloads cleanly, preventing mixed
 *   old/new module versions on flaky mobile connections.
 * - Static CDNs (Tailwind, Firebase SDK, Chart.js, Google Fonts): Strict Cache-First.
 * - Firebase Auth, Firestore & Google GIS APIs: Untouched (direct live network).
 */

const APP_CACHE = 'delights-flow-app';
const RUNTIME_CACHE = 'delights-flow-runtime';
const ACTIVE_CACHES = [APP_CACHE, RUNTIME_CACHE];

const SHELL_ASSETS = [
  './index.html',
  './manifest.json',
  './shop.html',
  './core.js',
  './money.js',
  './shop.js'
];

const SHELL_CHECK_COOLDOWN_MS = 10000;
const SHELL_CHECK_DELAY_MS = 500;
let lastShellCheckAt = 0;
let activeCheckPromise = null;

/**
 * Checks if a cross-origin request targets a cacheable static CDN asset.
 */
function isStaticCdn(url) {
  if (url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) return true;
  if (url.origin === 'https://cdn.jsdelivr.net' && url.pathname.startsWith('/npm/chart.js@')) return true;
  if (url.origin === 'https://fonts.gstatic.com') return true;
  if (url.origin === 'https://cdn.tailwindcss.com') return true;
  if (url.origin === 'https://fonts.googleapis.com') return true;
  return false;
}

/**
 * Normalizes a same-origin URL so directory/root navigations (e.g. "/Delights-Flow/")
 * always map to "./index.html", preventing stale root cache entries from shadowing updates.
 */
function normalizeShellUrl(rawUrl) {
  const url = new URL(rawUrl, self.location.href);
  if (url.pathname.endsWith('/')) {
    return new URL('./index.html', url.href).href;
  }
  return `${url.origin}${url.pathname}`;
}

/**
 * Produces a clean, non-redirected clone safe for Cache Storage.
 */
async function toCacheable(res) {
  if (!res) return null;
  if (res.type === 'opaque') return res.clone();
  if (!res.ok) return null;
  if (!res.redirected) return res.clone();
  const buf = await res.clone().arrayBuffer();
  return new Response(buf, { status: res.status, statusText: res.statusText, headers: res.headers });
}

/**
 * Byte-level comparison between cached and fresh responses.
 */
async function responsesDiffer(oldRes, newRes) {
  if (!oldRes) return true;
  const [a, b] = await Promise.all([oldRes.clone().arrayBuffer(), newRes.clone().arrayBuffer()]);
  if (a.byteLength !== b.byteLength) return true;
  const va = new Uint8Array(a);
  const vb = new Uint8Array(b);
  for (let i = 0; i < va.length; i++) {
    if (va[i] !== vb[i]) return true;
  }
  return false;
}

/**
 * Matches a same-origin request against the App Shell cache using normalized keys.
 */
async function matchShell(req) {
  try {
    const cache = await caches.open(APP_CACHE);
    const normalized = normalizeShellUrl(req.url);
    const hit = await cache.match(normalized);
    if (hit) return hit;

    if (req.mode === 'navigate') {
      const indexUrl = new URL('./index.html', self.location.href).href;
      return await cache.match(indexUrl);
    }
  } catch {}
  return null;
}

/**
 * Notifies all open client tabs that a fresh atomic shell bundle is cached and ready.
 */
async function notifyClientsUpdateReady() {
  try {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    list.forEach((client) => client.postMessage({ type: 'DF_UPDATE_READY' }));
  } catch {}
}

/**
 * Atomically checks ALL shell assets against the server.
 * Only commits to APP_CACHE and notifies clients when EVERY asset succeeds cleanly,
 * ensuring index.html, core.js, money.js, and shop.js are never out of sync.
 */
function scheduleShellCheck() {
  const now = Date.now();
  if (activeCheckPromise) return activeCheckPromise;
  if (now - lastShellCheckAt < SHELL_CHECK_COOLDOWN_MS) return Promise.resolve();
  lastShellCheckAt = now;

  activeCheckPromise = new Promise((resolve) => {
    setTimeout(async () => {
      try {
        const cache = await caches.open(APP_CACHE);
        let anyChanged = false;
        let allFetched = true;
        const freshEntries = [];

        await Promise.all(
          SHELL_ASSETS.map(async (asset) => {
            const resolved = new URL(asset, self.location.href).href;
            try {
              const res = await fetch(resolved, { cache: 'no-cache' });
              const clean = await toCacheable(res);
              if (!clean || res.type !== 'basic') {
                allFetched = false;
                return;
              }
              const prev = await cache.match(resolved);
              if (await responsesDiffer(prev, clean)) anyChanged = true;
              freshEntries.push([resolved, clean]);
            } catch {
              allFetched = false;
            }
          })
        );

        // Strict atomic commit: require every shell file to be present before swapping cache
        if (allFetched && anyChanged && freshEntries.length === SHELL_ASSETS.length) {
          await Promise.all(freshEntries.map(([url, res]) => cache.put(url, res)));
          await notifyClientsUpdateReady();
        }
      } catch {}
      activeCheckPromise = null;
      resolve();
    }, SHELL_CHECK_DELAY_MS);
  });

  return activeCheckPromise;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) =>
      Promise.allSettled(
        SHELL_ASSETS.map(async (asset) => {
          const resolved = new URL(asset, self.location.href).href;
          const res = await fetch(resolved, { cache: 'no-cache' });
          const clean = await toCacheable(res);
          if (clean && res.type === 'basic') await cache.put(resolved, clean);
        })
      )
    ).finally(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !ACTIVE_CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(async () => {
        // Purge any legacy trailing-slash root cache entry so "./index.html" is always authoritative
        try {
          const cache = await caches.open(APP_CACHE);
          const rootUrl = new URL('./', self.location.href).href;
          await cache.delete(rootUrl);
        } catch {}
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 1. Same-origin App Shell: 0ms Cache Hit + Atomic Background Update Check
  if (url.origin === location.origin) {
    const cacheKey = normalizeShellUrl(req.url);
    let resolveBg;
    const bgDone = new Promise((r) => { resolveBg = r; });
    event.waitUntil(bgDone);

    event.respondWith((async () => {
      try {
        const cached = await matchShell(req);
        if (cached) {
          scheduleShellCheck().finally(resolveBg);
          return cached;
        }

        const res = await fetch(cacheKey, { cache: 'no-cache' });
        const clean = await toCacheable(res);
        if (clean && res.type === 'basic') {
          const cache = await caches.open(APP_CACHE);
          await cache.put(cacheKey, clean.clone());
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

  // 2. Static CDN libraries & fonts: Strict Cache-First (zero extra network calls once cached)
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