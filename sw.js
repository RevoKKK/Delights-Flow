self.addEventListener('install', (e) => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim()); // Claim clients immediately
});

self.addEventListener('fetch', (e) => {
  // Network-first approach: always fetch fresh code from GitHub Pages
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});
