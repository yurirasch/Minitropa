const CACHE_NAME = 'mini-tropa-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/game.js',
  '/manifest.json',
  '/data/characters.json',
  '/data/cities.json',
  '/data/states.json',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache.map(url => {
          return new Request(url, {cache: 'reload'});
        })).catch(err => {
          console.log('Cache addAll error:', err);
          // Try to cache individually
          return Promise.all(
            urlsToCache.map(url => {
              return cache.add(url).catch(err => {
                console.log('Failed to cache:', url, err);
              });
            })
          );
        });
      })
  );
  self.skipWaiting();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  return self.clients.claim();
});
