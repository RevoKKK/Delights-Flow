/**
 * Delights Flow — Fast Startup Service Worker (sw.js)
 * Strategy: Network-First with 2-Second Timeout + Instant Cache Fallback
 * Ensures the app never hangs on a blank/loading screen on slow mobile networks,
 * while still updating cached files in the background whenever online.
 */

const CACHE_NAME = 'delights-flow-v2';
const NETWORK_TIMEOUT_MS = 2000;
const ASSETS = ['./', './index.html', './shop.html', './manifest.json'];

/**
 * Install Event: Pre-cache core app shell files and activate immediately.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

/**
 * Activate Event: Remove outdated caches and take control of open clients right away.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

/**
 * Helper: Safely look up a cached response (ignoring query params like ?tx=...).
 */
async function matchFromCache(request) {
  try {
    const exactOrClean = await caches.match(request, { ignoreSearch: true });
    if (exactOrClean) return exactOrClean;
    if (request.mode === 'navigate') {
      const url = new URL(request.url);
      if (url.pathname.endsWith('shop.html')) {
        return (await caches.match('./shop.html')) || (await caches.match('./index.html'));
      }
      return await caches.match('./index.html');
    }
  } catch {
    // Ignore cache read errors
  }
  return null;
}

/**
 * Fetch Event:
 * - Only handles same-origin GET requests (never intercepts Firebase Auth/Firestore or CDNs).
 * - Races network against a 2-second timeout so slow networks fall back to cache immediately.
 * - Keeps the network fetch alive via event.waitUntil to refresh the cache in the background.
 */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  // Store clean cache key without query strings (e.g., shop.html?tx=... -> shop.html)
  const cleanUrl = `${url.origin}${url.pathname}`;

  const networkPromise = fetch(event.request)
    .then(async (response) => {
      if (response && response.ok && response.type === 'basic') {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(cleanUrl, response.clone());
        } catch {
          // Ignore cache write errors
        }
      }
      return response;
    });

  // Ensure background cache update finishes even if we already served the cached copy
  event.waitUntil(networkPromise.catch(() => {}));

  event.respondWith(
    (async () => {
      let timeoutId = null;

      const timeoutPromise = new Promise((resolve) => {
        timeoutId = setTimeout(() => resolve('TIMEOUT'), NETWORK_TIMEOUT_MS);
      });

      try {
        const winner = await Promise.race([
          networkPromise.then((res) => ({ type: 'NETWORK', res })),
          timeoutPromise.then(() => ({ type: 'TIMEOUT' }))
        ]);

        clearTimeout(timeoutId);

        if (winner.type === 'NETWORK' && winner.res) {
          return winner.res;
        }

        // Network took longer than 2s -> serve cached copy immediately if available
        const cached = await matchFromCache(event.request);
        if (cached) return cached;

        // First-ever visit with no cache yet -> wait for the live network response
        return await networkPromise;
      } catch {
        clearTimeout(timeoutId);
        // Network failed / offline -> serve cache fallback
        const cached = await matchFromCache(event.request);
        if (cached) return cached;
        return new Response('Offline — please reconnect once to load Delights Flow.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })()
  );
});