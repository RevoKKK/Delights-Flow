/**
 * Delights Flow — Instant Startup Service Worker (sw.js — v4)
 *
 * Strategy:
 * 1. Same-origin App Shell (index.html, shop.html, manifest.json):
 *    Stale-While-Revalidate (Cache-First) — opens in 0ms from local cache and
 *    quietly fetches fresh updates from GitHub Pages in the background.
 * 2. Static CDN Assets (Firebase v11.6.1 SDK, Tailwind CSS, Chart.js, Inter Fonts):
 *    Runtime Cache-First — prevents slow mobile networks from stalling app boot.
 * 3. Auth & Firestore APIs:
 *    Never intercepted — always go directly to the network (handled by Firestore's own offline cache).
 */

const APP_CACHE = 'delights-flow-v4';
const RUNTIME_CACHE = 'delights-flow-runtime-v4';
const ACTIVE_CACHES = [APP_CACHE, RUNTIME_CACHE];

const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './shop.html',
  './manifest.json'
];

/**
 * Determine whether an external URL is a safe, read-only static library/font
 * eligible for runtime caching. Never matches Firebase Auth or Firestore APIs.
 */
function isCacheableStaticCDN(url) {
  if (url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    return { cacheable: true, immutable: true };
  }
  if (url.origin === 'https://cdn.jsdelivr.net' && url.pathname.startsWith('/npm/chart.js@')) {
    return { cacheable: true, immutable: true };
  }
  if (url.origin === 'https://fonts.gstatic.com') {
    return { cacheable: true, immutable: true };
  }
  if (url.origin === 'https://cdn.tailwindcss.com') {
    return { cacheable: true, immutable: false };
  }
  if (url.origin === 'https://fonts.googleapis.com') {
    return { cacheable: true, immutable: false };
  }
  return { cacheable: false, immutable: false };
}

/**
 * Install Event: Pre-cache core app shell files and activate immediately.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

/**
 * Activate Event: Clean up all outdated cache versions (v1/v2/v3) and claim open tabs.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !ACTIVE_CACHES.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/**
 * Helper: Safely look up an app shell file from APP_CACHE (ignoring query params like ?tx=...).
 */
async function matchAppShell(request) {
  try {
    const cache = await caches.open(APP_CACHE);
    const matched = await cache.match(request, { ignoreSearch: true });
    if (matched) return matched;

    if (request.mode === 'navigate') {
      const url = new URL(request.url);
      if (url.pathname.endsWith('shop.html')) {
        return (await cache.match('./shop.html')) || (await cache.match('./index.html'));
      }
      return await cache.match('./index.html');
    }
  } catch {
    // Ignore cache read errors
  }
  return null;
}

/**
 * Fetch Event Handler:
 * - Same-origin GET: Stale-While-Revalidate (instant 0ms boot + silent background refresh).
 * - Whitelisted Static CDNs: Cache-First (with background refresh for non-versioned URLs).
 * - Everything else (Firebase Auth, Firestore, GIS, etc.): Pass straight through untouched.
 */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ---------------------------------------------------------------------------
  // 1. SAME-ORIGIN APP SHELL (Stale-While-Revalidate)
  // ---------------------------------------------------------------------------
  if (url.origin === location.origin) {
    // Normalize cache key without query strings (e.g. shop.html?tx=123 -> shop.html)
    const cleanUrl = `${url.origin}${url.pathname}`;

    const backgroundRefresh = fetch(event.request, { cache: 'no-cache' })
      .then(async (response) => {
        if (response && response.ok && response.type === 'basic') {
          try {
            const cache = await caches.open(APP_CACHE);
            await cache.put(cleanUrl, response.clone());
          } catch {
            // Ignore quota/cache write errors
          }
        }
        return response;
      });

    event.waitUntil(backgroundRefresh.catch(() => {}));

    event.respondWith(
      (async () => {
        // Serve cached copy immediately if available (0ms startup)
        const cached = await matchAppShell(event.request);
        if (cached) return cached;

        // First-ever visit with empty cache: wait for network response
        try {
          return await backgroundRefresh;
        } catch {
          const fallback = await matchAppShell(event.request);
          if (fallback) return fallback;
          return new Response('Offline — please reconnect once to load Delights Flow.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
      })()
    );
    return;
  }

  // ---------------------------------------------------------------------------
  // 2. STATIC CDN LIBRARIES & FONTS (Runtime Cache-First)
  // ---------------------------------------------------------------------------
  const cdnInfo = isCacheableStaticCDN(url);
  if (!cdnInfo.cacheable) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(event.request);

      const fetchAndStore = fetch(event.request)
        .then(async (response) => {
          if (response && (response.ok || response.type === 'opaque')) {
            try {
              await cache.put(event.request, response.clone());
            } catch {
              // Ignore cache storage errors
            }
          }
          return response;
        });

      if (cached) {
        // Versioned immutable libraries (Firebase v11.6.1, Chart.js, woff2) need no re-fetch;
        // unversioned assets (Tailwind CDN, Google Fonts CSS) refresh quietly in background.
        if (!cdnInfo.immutable) {
          event.waitUntil(fetchAndStore.catch(() => {}));
        }
        return cached;
      }

      try {
        return await fetchAndStore;
      } catch {
        return new Response('', { status: 504, statusText: 'CDN Offline' });
      }
    })()
  );
});