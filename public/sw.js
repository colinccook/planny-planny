const CACHE_NAME = 'planny-v1'
// Paths are resolved relative to this service worker's location, which the
// browser sets to the SW registration URL (e.g. `/planny-planny/sw.js` on
// GitHub Pages, `/sw.js` at an apex domain). Keeping these relative means the
// cache works regardless of the deploy base path.
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './pwa-192x192.svg',
  './pwa-512x512.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Network-first for API calls
  if (request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  )
})
