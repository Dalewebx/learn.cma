// CMA Service Worker — caches app shell for instant loading on return visits
const CACHE = 'cma-v1';
const SHELL = [
  '/portal',
  '/apply',
  '/',
];

// Install: cache the app shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(SHELL);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: remove old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: serve from cache, update in background (stale-while-revalidate)
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Only cache same-origin GET requests for HTML pages
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/rest/v1')) return; // never cache Supabase API
  if (url.pathname.startsWith('/api')) return; // never cache serverless functions
  if (url.pathname.startsWith('/storage')) return; // never cache storage

  e.respondWith(
    caches.open(CACHE).then(function(cache) {
      return cache.match(e.request).then(function(cached) {
        // Always fetch fresh in background
        var fetchPromise = fetch(e.request).then(function(response) {
          if (response && response.status === 200) {
            cache.put(e.request, response.clone());
          }
          return response;
        }).catch(function() { return cached; }); // offline fallback

        // Return cached immediately if available, otherwise wait for network
        return cached || fetchPromise;
      });
    })
  );
});
