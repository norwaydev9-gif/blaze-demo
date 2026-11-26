const CACHE = 'blaze-demo-v7'
const SCOPE = self.registration.scope
const url = (path) => new URL(path, SCOPE).toString()
const SHELL = [
  SCOPE,
  url('index.html'),
  url('icon.svg'),
  url('icon-192.png'),
  url('icon-512.png'),
  url('manifest.webmanifest'),
  url('images/hero.jpg'),
  url('images/cards.jpg'),
  url('images/crash.jpg'),
  url('images/slots.jpg'),
  url('images/roulette.jpg'),
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(url('index.html'), copy))
          return response
        })
        .catch(() => caches.match(url('index.html'))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
