/**
 * Service worker for Co-Exist PWA.
 *
 * Strategy:
 *   - Pre-cache: app shell (index.html, offline fallback)
 *   - Cache-first: static assets (JS chunks, CSS, fonts, images, icons, audio)
 *   - Network-first: HTML navigation (with offline fallback)
 *   - Skip: Supabase API calls (handled by React Query cache)
 */

const CACHE_NAME = 'coexist-v2'

const PRECACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
]

/* ------- Install: pre-cache shell ------- */

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)),
  )
  self.skipWaiting()
})

/* ------- Activate: clean old caches ------- */

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

/* ------- Fetch: routing logic ------- */

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET
  if (request.method !== 'GET') return

  // Skip Supabase API / realtime calls
  if (url.hostname.includes('supabase')) return

  // Skip browser extensions, chrome-extension, etc.
  if (!url.protocol.startsWith('http')) return

  // Static assets: cache-first (JS chunks, CSS, fonts, images, icons, audio)
  const isStatic =
    url.pathname.match(
      /\.(woff2?|ttf|eot|otf|png|jpe?g|gif|svg|webp|ico|avif|css|js|mp3|wav|ogg|json)$/,
    ) || url.pathname.startsWith('/assets/')

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        }).catch(() => {
          // If both cache and network fail for non-critical assets, return empty
          return new Response('', { status: 503, statusText: 'Offline' })
        })
      }),
    )
    return
  }

  // Navigation requests (HTML): network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() =>
          caches.match(request).then((cached) =>
            cached || caches.match('/offline.html'),
          ),
        ),
    )
    return
  }

  // Everything else: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request)),
  )
})
